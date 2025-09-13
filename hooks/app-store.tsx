import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DPSPost, ChatMessage, User, RegisterUserData, TelegramUserData, POST_LIFETIMES, RELEVANCE_CHECK_INTERVALS } from '@/types';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const [AppProviderInternal, useAppInternal] = createContextHook(() => {
  const [posts, setPosts] = useState<DPSPost[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    if (Platform.OS === 'web') {
      return 'Неизвестный адрес';
    }
    
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result && result.length > 0) {
        const location = result[0];
        const parts = [];
        if (location.street) parts.push(location.street);
        if (location.streetNumber) parts.push(location.streetNumber);
        if (location.district) parts.push(location.district);
        if (location.city) parts.push(location.city);
        return parts.join(', ') || 'Неизвестный адрес';
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
    return 'Неизвестный адрес';
  };

  // Load data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedPosts, storedMessages, storedUser, storedUsers] = await Promise.all([
          AsyncStorage.getItem('dps_posts'),
          AsyncStorage.getItem('chat_messages'),
          AsyncStorage.getItem('current_user'),
          AsyncStorage.getItem('all_users'),
        ]);

        if (storedPosts) {
          const parsedPosts = JSON.parse(storedPosts);
          const now = Date.now();
          
          // Фильтруем просроченные посты и обновляем посты без адресов
          const postsWithAddresses = await Promise.all(
            parsedPosts
              .filter((post: DPSPost) => {
                // Если у поста нет expiresAt, добавляем его (для старых постов)
                if (!post.expiresAt) {
                  const postLifetime = POST_LIFETIMES[post.type] || POST_LIFETIMES.dps;
                  post.expiresAt = post.timestamp + postLifetime;
                }
                // Фильтруем просроченные посты
                return post.expiresAt > now;
              })
              .map(async (post: DPSPost) => {
                if (!post.address && Platform.OS !== 'web') {
                  const address = await getAddressFromCoords(post.latitude, post.longitude);
                  return { ...post, address };
                }
                return post;
              })
          );
          setPosts(postsWithAddresses);
        } else {
          // Не создаем демо посты, начинаем с пустого списка
          setPosts([]);
        }
        if (storedMessages) setMessages(JSON.parse(storedMessages));
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          setUsers(parsedUsers);
          
          // Проверяем, есть ли админ @herlabsn
          const adminExists = parsedUsers.find((u: User) => u.telegramUsername === 'herlabsn');
          
          if (!adminExists) {
            // Создаем админа только если его нет
            const adminUser: User = {
              id: 'admin-herlabsn',
              name: 'Администратор',
              telegramUsername: 'herlabsn',
              isAdmin: true,
              isModerator: true,
              registeredAt: Date.now(),
            };
            
            const updatedUsers = [...parsedUsers, adminUser];
            setUsers(updatedUsers);
            await AsyncStorage.setItem('all_users', JSON.stringify(updatedUsers));
          }
        } else {
          // Создаем только админа @herlabsn
          const adminUser: User = {
            id: 'admin-herlabsn',
            name: 'Администратор',
            telegramUsername: 'herlabsn',
            isAdmin: true,
            isModerator: true,
            registeredAt: Date.now(),
          };
          setUsers([adminUser]);
          await AsyncStorage.setItem('all_users', JSON.stringify([adminUser]));
        }
        
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save posts when they change
  useEffect(() => {
    if (!isLoading && posts.length > 0) {
      AsyncStorage.setItem('dps_posts', JSON.stringify(posts));
    }
  }, [posts, isLoading]);

  // Save messages when they change
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      AsyncStorage.setItem('chat_messages', JSON.stringify(messages));
    }
  }, [messages, isLoading]);

  // Функция проверки актуальности поста через ИИ
  const checkPostRelevance = async (post: DPSPost): Promise<boolean> => {
    try {
      // Добавляем таймаут для запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Уменьшаем таймаут до 5 секунд
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Пост создан ${Math.floor((Date.now() - post.timestamp) / (60 * 1000))} минут назад.
Тип: ${post.type}
Описание: ${post.description.slice(0, 100)}

Ответь одним словом: RELEVANT или NOT_RELEVANT`
            }
          ]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('Error checking post relevance: Response not OK');
        return true; // В случае ошибки считаем пост актуальным
      }

      const data = await response.json();
      const result = data.completion?.toLowerCase() || '';
      const isRelevant = result.includes('relevant') && !result.includes('not_relevant');
      
      return isRelevant;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log(`Таймаут при проверке актуальности поста ${post.id}`);
        } else {
          console.error('Error checking post relevance:', error.message);
        }
      }
      return true; // В случае ошибки считаем пост актуальным
    }
  };

  // Автоматическая очистка просроченных постов и проверка актуальности
  useEffect(() => {
    // Функция для проверки и очистки постов
    const checkAndCleanPosts = async () => {
      const now = Date.now();
      
      // Загружаем посты из AsyncStorage для проверки даже когда приложение было закрыто
      try {
        const storedPosts = await AsyncStorage.getItem('dps_posts');
        if (storedPosts) {
          const parsedPosts = JSON.parse(storedPosts);
          
          // Фильтруем просроченные посты
          const activePosts = parsedPosts.filter((p: DPSPost) => {
            // Если у поста нет expiresAt, добавляем его
            if (!p.expiresAt) {
              const postLifetime = POST_LIFETIMES[p.type] || POST_LIFETIMES.dps;
              p.expiresAt = p.timestamp + postLifetime;
            }
            return p.expiresAt > now;
          });
          
          if (activePosts.length !== parsedPosts.length) {
            console.log(`Удалено ${parsedPosts.length - activePosts.length} просроченных постов`);
            setPosts(activePosts);
            await AsyncStorage.setItem('dps_posts', JSON.stringify(activePosts));
          } else {
            setPosts(activePosts);
          }
          
          // Проверяем актуальность постов
          const postsToCheck = activePosts.filter((post: DPSPost) => {
            const checkInterval = RELEVANCE_CHECK_INTERVALS[post.type];
            const lastCheck = post.relevanceCheckedAt || post.timestamp;
            return now - lastCheck > checkInterval;
          });
          
          // Ограничиваем количество одновременных проверок
          const maxConcurrentChecks = 1;
          const postsToCheckLimited = postsToCheck.slice(0, maxConcurrentChecks);
          
          // Асинхронно проверяем актуальность
          for (const post of postsToCheckLimited) {
            try {
              const isRelevant = await checkPostRelevance(post);
              
              setPosts((currentPosts) => {
                const updated = currentPosts.map((p) => 
                  p.id === post.id 
                    ? { 
                        ...p, 
                        isRelevant, 
                        relevanceCheckedAt: now,
                        expiresAt: !isRelevant ? Math.min(p.expiresAt, now + 30 * 60 * 1000) : p.expiresAt
                      }
                    : p
                );
                // Сохраняем обновленные посты
                AsyncStorage.setItem('dps_posts', JSON.stringify(updated));
                return updated;
              });
            } catch (error) {
              console.error(`Ошибка при проверке поста ${post.id}:`, error);
              setPosts((currentPosts) => {
                const updated = currentPosts.map((p) => 
                  p.id === post.id 
                    ? { ...p, relevanceCheckedAt: now }
                    : p
                );
                AsyncStorage.setItem('dps_posts', JSON.stringify(updated));
                return updated;
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking posts:', error);
      }
    };
    
    // Проверяем сразу при загрузке
    checkAndCleanPosts();
    
    // Устанавливаем интервал для регулярной проверки
    const interval = setInterval(checkAndCleanPosts, 60 * 1000); // Проверяем каждую минуту

    return () => clearInterval(interval);
  }, []);

  const analyzeTextContent = async (text: string): Promise<{ isAppropriate: boolean; reason?: string }> => {
    try {
      const txtLower = text.toLowerCase();
      const roadKeywords = [
        // Основные термины
        'дпс', 'дтп', 'камера', 'ремонт', 'дорог', 'патруль', 'пробк', 'светофор', 'объезд', 'знак', 'машин', 'авто',
        // Сленговые названия
        'гайц', 'мусор', 'мент', 'гибдд', 'полиц', 'радар', 'пушка',
        // Местоположение
        'куст', 'слева', 'справа', 'поворот', 'засад', 'засел', 'скрыт',
        // Действия
        'стоят', 'сидят', 'дежур', 'провер', 'тормоз', 'останавл', 'объезж',
        // Общие дорожные термины
        'трасс', 'шоссе', 'мост', 'перекресток', 'разворот', 'въезд', 'выезд'
      ];
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Ты модератор текстов для приложения дорожной информации в Кингисеппе. Цель — пропускать полезные сообщения о дороге.

ПРАВИЛА МОДЕРАЦИИ:
1) Допускается ненормативная лексика, если она не направлена на конкретных людей/группы и используется как междометие по теме дороги. Недопустимы персональные оскорбления, травля, угрозы, разжигание ненависти.

2) ПОНИМАЙ НЕФОРМАЛЬНЫЕ ОПИСАНИЯ МЕСТОПОЛОЖЕНИЙ:
   - "за кустами", "в кустах" = скрытое расположение
   - "слева", "справа", "за поворотом" = указания направления
   - "гайцы" = сленговое название ДПС/ГИБДД
   - "мусора", "менты" = сленговые названия полиции (допустимо в контексте дороги)
   - "стоят", "сидят", "дежурят" = указание на присутствие
   - "проверяют", "тормозят", "останавливают" = действия ДПС
   - "засада", "засели" = скрытый пост контроля
   - "радар", "пушка" = камера/радар скорости
   - "объезжайте", "в объезд" = рекомендация маршрута

3) ОДОБРЯЙ ПОСТЫ С ДОРОЖНОЙ ИНФОРМАЦИЕЙ:
   - Посты ДПС, патруль, камеры, ДТП, ремонт дорог
   - Предупреждения о пробках, объездах
   - Информация о животных на дороге
   - Сообщения о знаках, светофорах
   - Неформальные описания местоположения постов

4) ОТКЛОНЯЙ:
   - Рекламу, спам, оффтоп
   - Персональные оскорбления, угрозы
   - Разжигание ненависти

Ответ строго в JSON: {"decision":"approve"|"reject","reason":"..."}
Если текст содержит дорожную информацию (даже в неформальном виде) и нет оскорблений/угроз — approve.`
            },
            {
              role: 'user',
              content: `Проанализируй комментарий: "${text}"`
            }
          ]
        })
      });

      if (!response.ok) {
        const hasRoad = roadKeywords.some(k => txtLower.includes(k));
        if (hasRoad) return { isAppropriate: true };
        return { isAppropriate: false, reason: 'Ошибка проверки контента' };
      }

      const data = await response.json();
      const raw = (data?.completion ?? '').trim();
      const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      let parsed: { decision?: string; reason?: string } = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // JSON parse failed, continue with fallback
      }

      const decision = (parsed.decision ?? '').toLowerCase();
      if (decision === 'approve') {
        return { isAppropriate: true };
      }

      if (decision === 'reject') {
        const reason = parsed.reason || 'Неподходящий контент';
        return { isAppropriate: false, reason };
      }

      const hasRoad = roadKeywords.some(k => txtLower.includes(k));
      if (hasRoad) {
        return { isAppropriate: true };
      }
      return { isAppropriate: false, reason: 'Не связано с дорожной тематикой' };
    } catch (error) {
      console.error('Error analyzing text content:', error);
      const txtLower = text.toLowerCase();
      const roadKeywords = [
        // Основные термины
        'дпс', 'дтп', 'камера', 'ремонт', 'дорог', 'патруль', 'пробк', 'светофор', 'объезд', 'знак', 'машин', 'авто',
        // Сленговые названия
        'гайц', 'мусор', 'мент', 'гибдд', 'полиц', 'радар', 'пушка',
        // Местоположение
        'куст', 'слева', 'справа', 'поворот', 'засад', 'засел', 'скрыт',
        // Действия
        'стоят', 'сидят', 'дежур', 'провер', 'тормоз', 'останавл', 'объезж',
        // Общие дорожные термины
        'трасс', 'шоссе', 'мост', 'перекресток', 'разворот', 'въезд', 'выезд'
      ];
      const hasRoad = roadKeywords.some(k => txtLower.includes(k));
      if (hasRoad) return { isAppropriate: true };
      return { isAppropriate: false, reason: 'Ошибка проверки контента' };
    }
  };

  const analyzeImageForAutoApproval = async (imageBase64: string, postType?: string, description?: string): Promise<{ shouldAutoApprove: boolean; reason?: string }> => {
    try {
      console.log('Analyzing image for post type:', postType, 'with description:', description);
      
      // Определяем текущее время суток и дату
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDate = now.toLocaleDateString('ru-RU');
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Определяем время суток более точно
      let timeOfDay: string;
      if (currentHour >= 6 && currentHour < 12) {
        timeOfDay = 'утро';
      } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDay = 'день';
      } else if (currentHour >= 18 && currentHour < 22) {
        timeOfDay = 'вечер';
      } else {
        timeOfDay = 'ночь';
      }
      
      // Определяем сезон
      const month = now.getMonth() + 1;
      let season: string;
      if (month >= 3 && month <= 5) {
        season = 'весна';
      } else if (month >= 6 && month <= 8) {
        season = 'лето';
      } else if (month >= 9 && month <= 11) {
        season = 'осень';
      } else {
        season = 'зима';
      }
      
      // Определяем ожидаемое содержимое по тематике
      const getThemeExpectations = (type: string) => {
        switch (type) {
          case 'roadwork':
            return {
              name: 'Дорожные работы',
              expected: 'дорожная техника (экскаваторы, асфальтоукладчики, катки, грузовики, краны), рабочие в спецодежде, ограждения, конусы, знаки "Дорожные работы", свежий асфальт, ремонт дорожного покрытия, строительные материалы, желтая спецтехника'
            };
          case 'other':
            return {
              name: 'Остальное (проблемы инфраструктуры)',
              expected: 'ямы на дороге, поврежденное покрытие, сломанные светофоры, поврежденные дорожные знаки, проблемы с освещением, разрушенные бордюры, проблемы с дренажем'
            };
          case 'dps':
            return {
              name: 'ДПС/Патруль',
              expected: 'полицейские автомобили, сотрудники ДПС, радары, камеры скорости, посты ГИБДД, патрульные машины'
            };
          case 'accident':
            return {
              name: 'ДТП',
              expected: 'поврежденные автомобили, следы аварии, эвакуаторы, скорая помощь, пожарные, полиция на месте ДТП'
            };
          case 'camera':
            return {
              name: 'Камеры',
              expected: 'камеры видеонаблюдения, радары скорости, стационарные посты контроля'
            };
          case 'animals':
            return {
              name: 'Животные',
              expected: 'животные на проезжей части или рядом с дорогой (лоси, кабаны, собаки, кошки и др.)'
            };
          default:
            return {
              name: 'Дорожная ситуация',
              expected: 'любая дорожная информация'
            };
        }
      };
      
      const themeInfo = getThemeExpectations(postType || 'other');
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Ты анализируешь фотографии для приложения дорожной информации в городе Кингисепп, Ленинградская область.

ВАЖНО: Если на фото есть спецтехника (желтые грузовики, экскаваторы, краны) - это ВСЕГДА дорожные работы, даже без описания!

СПРАВОЧНАЯ ИНФОРМАЦИЯ О ВРЕМЕНИ:
- Текущее время: ${currentTime} (${timeOfDay})
- Дата: ${currentDate}
- Сезон: ${season}
- Местоположение: Кингисепп, Ленинградская область

ТЕМАТИКА ПОСТА: ${themeInfo.name}
ОЖИДАЕМОЕ СОДЕРЖИМОЕ: ${themeInfo.expected}
${description ? `ОПИСАНИЕ ОТ ПОЛЬЗОВАТЕЛЯ: ${description}` : 'ОПИСАНИЕ ОТСУТСТВУЕТ'}

ПРАВИЛА АНАЛИЗА:
1. СПЕЦТЕХНИКА = ДОРОЖНЫЕ РАБОТЫ:
   - Желтые грузовики, экскаваторы, краны = дорожные работы
   - Даже без описания, спецтехника указывает на работы
   - Техника может стоять без активных работ - это тоже важно

2. БЕЗ ОПИСАНИЯ АНАЛИЗИРУЙ ВИЗУАЛЬНО:
   - Ищи ключевые объекты на фото
   - Спецтехника, ДПС, камеры, животные - всё важно
   - Контекст определяй по визуальным признакам

3. ПРОВЕРКА ВРЕМЕНИ СУТОК (ОБЯЗАТЕЛЬНО):
   - Сравни освещение на фото с текущим временем
   - Если сейчас ${timeOfDay} (${currentTime}), фото должно соответствовать этому времени
   - ОТКЛОНЯЙ фото, если время съемки явно не соответствует текущему времени
   - Дневное фото вечером/ночью = MODERATE
   - Ночное фото днем = MODERATE

4. ТЕМАТИЧЕСКОЕ СООТВЕТСТВИЕ:
   - Для "Дорожные работы": любая спецтехника, раб��чие, ремонт
   - Для "Остальное": проблемы инфраструктуры
   - Автоматически определяй тему по содержимому

ОДОБРЯЙ (APPROVE) если:
- Есть спецтехника (даже без описания)
- Есть дорожные работы или их признаки
- Есть ДПС, камеры, животные на дороге
- Есть проблемы с дорогой (ямы, поломки)
- Фото связано с дорожной ситуацией
- Качество фото позволяет определить содержимое

ОТКЛОНЯЙ (MODERATE) если:
- Совсем не связано с дорогой
- Явный спам или оффтоп
- Невозможно определить содержимое из-за плохого качества
- Подозрение на поддельное фото (скриншот сайта и т.п.)
- Время съемки не соответствует текущему времени (дневное фото вечером/ночью или наоборот)`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Проанализируй это изображение.

ВАЖНО: Сейчас ${currentTime} (${timeOfDay}). Проверь, соответствует ли освещение на фото текущему времени суток!

${description ? `Описание от пользователя: "${description}"` : 'Пользователь не добавил описание'}

Тематика поста: ${themeInfo.name}
Ожидаемое содержимое: ${themeInfo.expected}

ПОРЯДОК ПРОВЕРКИ:
1. ПРОВЕРЬ ВРЕМЯ: Соответствует ли освещение на фото текущему времени (${timeOfDay})?
2. Определи основное содержимое фото
3. Если видишь спецтехнику - это дорожные работы, но проверь время!
4. Проверь соответствие дорожной тематике
5. Без описания определяй контекст по визуальным признакам
6. Оцени качество и подлинность фото

Ответь: APPROVE или MODERATE с кратким обоснованием.`
                },
                {
                  type: 'image',
                  image: imageBase64
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        console.log('Image analysis failed: Response not OK');
        return { shouldAutoApprove: false };
      }

      const data = await response.json();
      
      const result = data.completion?.toLowerCase() || '';
      
      if (result.includes('approve')) {
        // Определяем причину одобрения на основе тематики и содержимого
        let reason = 'Содержимое соответствует тематике';
        
        if (postType === 'roadwork') {
          if (result.includes('техник') || result.includes('экскаватор') || result.includes('асфальт')) {
            reason = 'Обнаружена дорожная техника и ремонтные работы';
          } else if (result.includes('рабоч') || result.includes('спецодежд')) {
            reason = 'Обнаружены дорожные рабочие';
          } else if (result.includes('конус') || result.includes('огражден')) {
            reason = 'Обнаружены ограждения дорожных работ';
          } else {
            reason = 'Подтверждены дорожные работы';
          }
        } else if (postType === 'other') {
          if (result.includes('ям') || result.includes('поврежден')) {
            reason = 'Обнаружены повреждения дорожного покрытия';
          } else if (result.includes('светофор') || result.includes('знак')) {
            reason = 'Обнаружены проблемы с дорожной инфраструктурой';
          } else {
            reason = 'Подтверждены проблемы дорожной инфраструктуры';
          }
        } else {
          // Для других тематик используем старую логику
          reason = result.includes('авария') || result.includes('дтп') ? 'Обнаружена авария' :
                   result.includes('дпс') || result.includes('пост') ? 'Обнаружен пост ДПС' :
                   result.includes('патруль') ? 'Обнаружен патруль' :
                   result.includes('камера') ? 'Обнаружена камера' :
                   result.includes('ремонт') || result.includes('дорог') ? 'Обнаружен ремонт дороги' :
                   result.includes('животн') ? 'Обнаружены животные на дороге' :
                   result.includes('пробк') ? 'Обнаружена пробка' :
                   result.includes('знак') || result.includes('светофор') ? 'Обнаружены дорожные знаки/светофоры' :
                   'Дорожная информация подтверждена';
        }
        
        return { shouldAutoApprove: true, reason };
      }
      
      // Логируем причину отклонения для отладки
      let moderationReason = 'Требует проверки модератором';
      if (result.includes('не соответствует') && result.includes('тематик')) {
        moderationReason = `Содержимое не соответствует тематике "${themeInfo.name}"`;
      } else if (result.includes('поддельн') || result.includes('скриншот') || result.includes('сайт')) {
        moderationReason = 'Подозрение на поддельное фото';
      } else if (result.includes('погод') && result.includes('не соответств')) {
        moderationReason = 'Погодные условия не соответствуют сезону';
      } else if (result.includes('качеств') || result.includes('размыт')) {
        moderationReason = 'Низкое качество изображения';
      } else if (result.includes('время') && (result.includes('не соответств') || result.includes('дневн') || result.includes('ночн'))) {
        moderationReason = 'Время съемки не соответствует текущему времени суток';
      }
      
      console.log('Image moderation result: needs manual review', moderationReason);
      return { shouldAutoApprove: false, reason: moderationReason };
    } catch (error) {
      console.error('Error analyzing image:', error);
      return { shouldAutoApprove: false, reason: 'Ошибка анализа изображения' };
    }
  };



  const makeModerator = useCallback((userId: string) => {
    if (!currentUser?.isAdmin) return;
    
    if (userId === currentUser.id) {
      const updatedUser = { ...currentUser, isModerator: true };
      setCurrentUser(updatedUser);
      AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  const registerUser = useCallback(async (userData: RegisterUserData): Promise<boolean> => {
    try {
      // Проверяем, существует ли пользователь с таким email
      const existingUser = users.find(u => u.email === userData.email);
      if (existingUser) {
        return false;
      }

      const newUser: User = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        isAdmin: false,
        isModerator: false,
        registeredAt: Date.now(),
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      setCurrentUser(newUser);

      // Сохраняем в AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('all_users', JSON.stringify(updatedUsers)),
        AsyncStorage.setItem('current_user', JSON.stringify(newUser)),
        AsyncStorage.setItem(`user_password_${newUser.id}`, userData.password),
      ]);

      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      return false;
    }
  }, [users]);

  const loginUser = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // Убираем демо режим - авторизация только через Telegram

      // Обычные пользователи
      const user = users.find(u => u.email === email);
      if (!user) {
        return false;
      }

      const storedPassword = await AsyncStorage.getItem(`user_password_${user.id}`);
      if (storedPassword !== password) {
        return false;
      }

      setCurrentUser(user);
      await AsyncStorage.setItem('current_user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error logging in user:', error);
      return false;
    }
  }, [users]);

  const loginWithTelegram = useCallback(async (telegramData: TelegramUserData): Promise<boolean> => {
    try {
      console.log('Logging in with Telegram data:', telegramData);
      
      // Проверяем, существует ли пользователь с таким Telegram ID
      let existingUser = users.find(u => u.telegramId === telegramData.telegramId);
      
      if (existingUser) {
        // Обновляем данные существующего пользователя
        const updatedUser: User = {
          ...existingUser,
          firstName: telegramData.firstName,
          lastName: telegramData.lastName,
          telegramUsername: telegramData.username,
          languageCode: telegramData.languageCode,
          isPremium: telegramData.isPremium,
          photoUrl: telegramData.photoUrl,
          name: `${telegramData.firstName} ${telegramData.lastName || ''}`.trim(),
          // Проверяем, является ли пользователь админом @herlabsn
          isAdmin: telegramData.username === 'herlabsn' ? true : existingUser.isAdmin,
          isModerator: telegramData.username === 'herlabsn' ? true : existingUser.isModerator,
        };
        
        // Обновляем в массиве пользователей
        const updatedUsers = users.map(u => u.id === existingUser!.id ? updatedUser : u);
        setUsers(updatedUsers);
        setCurrentUser(updatedUser);
        
        await Promise.all([
          AsyncStorage.setItem('all_users', JSON.stringify(updatedUsers)),
          AsyncStorage.setItem('current_user', JSON.stringify(updatedUser)),
        ]);
        
        console.log('Updated existing Telegram user:', updatedUser);
        return true;
      } else {
        // Создаем нового пользователя
        const newUser: User = {
          id: `tg_${telegramData.telegramId}`,
          name: `${telegramData.firstName} ${telegramData.lastName || ''}`.trim(),
          telegramId: telegramData.telegramId,
          firstName: telegramData.firstName,
          lastName: telegramData.lastName,
          telegramUsername: telegramData.username,
          languageCode: telegramData.languageCode,
          isPremium: telegramData.isPremium,
          photoUrl: telegramData.photoUrl,
          // Проверяем, является ли пользователь админом @herlabsn
          isAdmin: telegramData.username === 'herlabsn',
          isModerator: telegramData.username === 'herlabsn',
          registeredAt: Date.now(),
        };
        
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        setCurrentUser(newUser);
        
        await Promise.all([
          AsyncStorage.setItem('all_users', JSON.stringify(updatedUsers)),
          AsyncStorage.setItem('current_user', JSON.stringify(newUser)),
        ]);
        
        console.log('Created new Telegram user:', newUser);
        return true;
      }
    } catch (error) {
      console.error('Error logging in with Telegram:', error);
      return false;
    }
  }, [users]);

  const logoutUser = useCallback(async () => {
    try {
      setCurrentUser(null);
      await AsyncStorage.removeItem('current_user');
    } catch (error) {
      console.error('Error logging out user:', error);
    }
  }, []);

  const addPost = useCallback(async (post: DPSPost) => {
    if (!currentUser) {
      return { success: false, error: 'Необходимо войти в систему' };
    }

    const oneMinuteAgo = Date.now() - 1 * 60 * 1000;
    const recentUserPosts = posts.filter(
      (p) => p.userId === currentUser.id && p.timestamp > oneMinuteAgo,
    );

    if (recentUserPosts.length >= 1) {
      const timeLeft = Math.ceil(
        (recentUserPosts[0].timestamp + 1 * 60 * 1000 - Date.now()) / 1000,
      );
      return {
        success: false,
        error: `Можно создавать только 1 пост в минуту. Подождите еще ${timeLeft} сек.`,
      };
    }

    const now = Date.now();
    const postLifetime = POST_LIFETIMES[post.type];
    const hasDescription = post.description.trim().length > 0 && post.description.trim() !== 'Без описания';
    const hasPhoto = !!post.photo;

    let finalPost = { 
      ...post,
      expiresAt: now + postLifetime,
      isRelevant: true,
      relevanceCheckedAt: now
    };

    console.log('Processing post:', {
      hasDescription,
      hasPhoto,
      description: post.description,
      type: post.type
    });

    // Проверяем описание только если оно есть и не является заглушкой
    let textApproved = true;
    if (hasDescription) {
      console.log('Checking text content:', post.description);
      const textAnalysis = await analyzeTextContent(post.description);
      if (!textAnalysis.isAppropriate) {
        console.log('Text rejected by AI:', textAnalysis.reason);
        // Сохраняем отклоненный пост для админ панели
        const rejectedPost = {
          ...finalPost,
          rejectedByAI: true,
          aiRejectionReason: textAnalysis.reason || 'Комментарий не содержит дорожной информации, является пустым/бессодержательным.',
          needsModeration: true
        };
        
        setPosts((prev) => [rejectedPost, ...prev]);
        
        // Возвращаем успех, но пост отправлен на модерацию
        return {
          success: true,
          message: 'Пост отправлен на модерацию'
        };
      }
      console.log('Text approved by AI');
      textApproved = true;
    }

    // Проверяем фото если оно есть
    let imageApproved = false;
    let imageAnalysisReason = '';
    if (hasPhoto) {
      console.log('Checking image for post type:', post.type, 'description:', post.description);
      const analysis = await analyzeImageForAutoApproval(post.photo!, post.type, post.description);
      imageApproved = analysis.shouldAutoApprove;
      imageAnalysisReason = analysis.reason || '';
      
      if (imageApproved) {
        console.log('Image auto-approved:', analysis.reason);
      } else {
        console.log('Image needs moderation:', analysis.reason);
      }
    }

    // Логика принятия решения:
    if (hasPhoto && imageApproved) {
      // Если есть фото и оно одобрено ИИ - публикуем сразу
      console.log('Post auto-approved based on image analysis');
      finalPost = {
        ...finalPost,
        needsModeration: false,
        autoApproved: true,
        autoApprovalReason: imageAnalysisReason,
      };
    } else if (hasDescription && textApproved && !hasPhoto) {
      // Если есть только описание и оно одобрено - публикуем сразу
      console.log('Text-only post auto-approved');
      finalPost = {
        ...finalPost,
        needsModeration: false,
        textApproved: true,
        autoApproved: true,
        autoApprovalReason: 'Описание одобрено ИИ',
      };
    } else if (hasPhoto && !imageApproved) {
      // Если есть фото, но оно не одобрено - отправляем на модерацию
      console.log('Post sent to moderation due to image analysis');
      finalPost = {
        ...finalPost,
        needsModeration: true,
        moderationReason: imageAnalysisReason || 'Требует проверки модератором',
      };
    } else {
      // Все остальные случаи - отправляем на модерацию
      console.log('Post sent to moderation - insufficient content or mixed results');
      finalPost = {
        ...finalPost,
        needsModeration: true,
        moderationReason: !hasPhoto && !hasDescription 
          ? 'Пост не содержит ни описания, ни фото' 
          : 'Требует проверки модератором',
      };
    }

    setPosts((prev) => [finalPost, ...prev]);
    console.log('Post added:', finalPost.id, 'Needs moderation:', finalPost.needsModeration);
    
    if (finalPost.needsModeration) {
      return { 
        success: true, 
        message: 'Пост отправлен на модерацию' 
      };
    }
    
    return { success: true };
  }, [currentUser, posts]);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const addMessage = useCallback(
    (text: string) => {
      if (!currentUser) return false;

      if (currentUser.isMuted && currentUser.mutedUntil && currentUser.mutedUntil > Date.now()) {
        return false;
      }

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, newMessage]);
      return true;
    },
    [currentUser],
  );

  const clearExpiredPosts = useCallback(() => {
    const now = Date.now();
    setPosts((prev) => prev.filter((p) => p.expiresAt > now));
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<Omit<User, 'id'>>) => {
      if (!currentUser) return;

      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
    },
    [currentUser],
  );

  const likePost = useCallback(
    (postId: string) => {
      if (!currentUser) return;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const likedBy = post.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.id);

            return {
              ...post,
              likes: hasLiked ? (post.likes || 0) - 1 : (post.likes || 0) + 1,
              likedBy: hasLiked
                ? likedBy.filter((id) => id !== currentUser.id)
                : [...likedBy, currentUser.id],
            };
          }
          return post;
        }),
      );
    },
    [currentUser],
  );

  const verifyPost = useCallback((postId: string) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, verified: true } : post)));
  }, []);

  const moderatePost = useCallback(
    (postId: string, approved: boolean) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      if (approved) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  needsModeration: false,
                  moderatedBy: currentUser.id,
                  moderatedAt: Date.now(),
                }
              : post,
          ),
        );
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    },
    [currentUser],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isDeleted: true,
                deletedBy: currentUser.id,
                deletedAt: Date.now(),
              }
            : msg,
        ),
      );
    },
    [currentUser],
  );

  const muteUser = useCallback(
    (userId: string, duration: number) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      const mutedUntil = Date.now() + duration;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isMuted: true,
                mutedUntil,
                mutedBy: currentUser.id,
              }
            : user,
        ),
      );

      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isMuted: true,
          mutedUntil,
          mutedBy: currentUser.id,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  const unmuteUser = useCallback(
    (userId: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isMuted: false,
                mutedUntil: undefined,
                mutedBy: undefined,
              }
            : user,
        ),
      );

      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isMuted: false,
          mutedUntil: undefined,
          mutedBy: undefined,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  const makeAdmin = useCallback(
    async (userId: string) => {
      // Временная функция для тестирования - позволяет любому пользователю стать админом
      if (userId === currentUser?.id) {
        const updatedUser = { ...currentUser, isAdmin: true, isModerator: true };
        setCurrentUser(updatedUser);
        
        // Также обновляем пользователя в общем списке
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, isAdmin: true, isModerator: true }
            : user
        ));
        
        await Promise.all([
          AsyncStorage.setItem('current_user', JSON.stringify(updatedUser)),
          AsyncStorage.setItem('all_users', JSON.stringify(
            users.map(user => 
              user.id === userId 
                ? { ...user, isAdmin: true, isModerator: true }
                : user
            )
          ))
        ]);
      }
    },
    [currentUser, users],
  );

  const banUser = useCallback(
    (userId: string, duration: number, reason: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      const bannedUntil = duration === -1 ? -1 : Date.now() + duration; // -1 для постоянного бана

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isBanned: true,
                bannedUntil,
                bannedBy: currentUser.id,
                banReason: reason,
              }
            : user,
        ),
      );

      // Если банят текущего пользователя, обновляем его данные
      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isBanned: true,
          bannedUntil,
          bannedBy: currentUser.id,
          banReason: reason,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  const unbanUser = useCallback(
    (userId: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isBanned: false,
                bannedUntil: undefined,
                bannedBy: undefined,
                banReason: undefined,
              }
            : user,
        ),
      );

      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isBanned: false,
          bannedUntil: undefined,
          bannedBy: undefined,
          banReason: undefined,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  const kickUser = useCallback(
    (userId: string, reason: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isKicked: true,
                kickedAt: Date.now(),
                kickedBy: currentUser.id,
                kickReason: reason,
              }
            : user,
        ),
      );

      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isKicked: true,
          kickedAt: Date.now(),
          kickedBy: currentUser.id,
          kickReason: reason,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  const unkickUser = useCallback(
    (userId: string) => {
      if (!currentUser?.isAdmin && !currentUser?.isModerator) return;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isKicked: false,
                kickedAt: undefined,
                kickedBy: undefined,
                kickReason: undefined,
              }
            : user,
        ),
      );

      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          isKicked: false,
          kickedAt: undefined,
          kickedBy: undefined,
          kickReason: undefined,
        };
        setCurrentUser(updatedUser);
        AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    },
    [currentUser],
  );

  // Временная функция для создания тестового отклоненного поста
  const createTestRejectedPost = useCallback(() => {
    if (!currentUser) return;
    
    const now = Date.now();
    const testPost: DPSPost = {
      id: `test-rejected-${now}`,
      description: 'Продаю машину недорого, звоните по телефону 123-456-789',
      latitude: 59.3733,
      longitude: 28.6134,
      address: 'Тестовый адрес, Кингисепп',
      timestamp: now,
      expiresAt: now + POST_LIFETIMES.dps,
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'dps',
      severity: 'medium',
      likes: 0,
      likedBy: [],
      needsModeration: true,
      rejectedByAI: true,
      aiRejectionReason: 'Пост содержит рекламу и не связан с дорожной тематикой. Обнаружена попытка продажи автомобиля.',
      isRelevant: true,
      relevanceCheckedAt: now,
    };
    
    setPosts((prev) => [testPost, ...prev]);
  }, [currentUser]);

  return useMemo(
    () => ({
      posts,
      messages,
      currentUser,
      users,
      isLoading,
      addPost,
      removePost,
      addMessage,
      clearExpiredPosts,
      updateUser,
      likePost,
      verifyPost,
      moderatePost,
      deleteMessage,
      muteUser,
      unmuteUser,
      makeAdmin,
      makeModerator,
      banUser,
      unbanUser,
      kickUser,
      unkickUser,
      registerUser,
      loginUser,
      loginWithTelegram,
      logoutUser,
      createTestRejectedPost,
    }),
    [
      posts,
      messages,
      currentUser,
      users,
      isLoading,
      addPost,
      removePost,
      addMessage,
      clearExpiredPosts,
      updateUser,
      likePost,
      verifyPost,
      moderatePost,
      deleteMessage,
      muteUser,
      unmuteUser,
      makeAdmin,
      makeModerator,
      banUser,
      unbanUser,
      kickUser,
      unkickUser,
      registerUser,
      loginUser,
      loginWithTelegram,
      logoutUser,
      createTestRejectedPost,
    ],
  );
});

// Wrapper provider that combines AppProviderInternal with AILearning
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProviderInternal>
      {children}
    </AppProviderInternal>
  );
}

// Enhanced useApp hook that integrates AI learning
export function useApp() {
  return useAppInternal();
}