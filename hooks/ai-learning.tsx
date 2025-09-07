import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AITrainingData, AIModelStats, DPSPost } from '@/types';

const INITIAL_MODEL_STATS: AIModelStats = {
  totalDecisions: 0,
  correctDecisions: 0,
  falsePositives: 0,
  falseNegatives: 0,
  accuracy: 0,
  lastTrainingDate: Date.now(),
  modelVersion: '1.0.0'
};

const TRAINING_INTERVAL = 60 * 60 * 1000; // 1 час
const MIN_TRAINING_SAMPLES = 20;

export const [AILearningProvider, useAILearning] = createContextHook(() => {
  const [trainingData, setTrainingData] = useState<AITrainingData[]>([]);
  const [modelStats, setModelStats] = useState<AIModelStats>(INITIAL_MODEL_STATS);
  const [isTraining, setIsTraining] = useState(false);
  const lastSyncTimeRef = useRef(0);

  // Загрузка данных обучения
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedTraining, storedStats] = await Promise.all([
          AsyncStorage.getItem('ai_training_data'),
          AsyncStorage.getItem('ai_model_stats')
        ]);

        if (storedTraining) {
          const parsed = JSON.parse(storedTraining);
          setTrainingData(parsed.slice(-1000)); // Храним только последние 1000 записей
        }

        if (storedStats) {
          setModelStats(JSON.parse(storedStats));
        }
      } catch (error) {
        console.error('Error loading AI training data:', error);
      }
    };

    loadData();
  }, []);

  // Сохранение данных обучения
  const saveTrainingData = useCallback(async (data: AITrainingData[]) => {
    try {
      await AsyncStorage.setItem('ai_training_data', JSON.stringify(data.slice(-1000)));
    } catch (error) {
      console.error('Error saving training data:', error);
    }
  }, []);

  // Сохранение статистики модели
  const saveModelStats = useCallback(async (stats: AIModelStats) => {
    try {
      await AsyncStorage.setItem('ai_model_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving model stats:', error);
    }
  }, []);

  // Определение времени суток
  const getTimeOfDay = useCallback((hour: number): 'morning' | 'day' | 'evening' | 'night' => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }, []);

  // Определение сезона
  const getSeason = useCallback((month: number): 'winter' | 'spring' | 'summer' | 'autumn' => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }, []);

  // Обучение модели
  const trainModelInternal = useCallback(async (data: AITrainingData[]) => {
    if (isTraining) return;
    
    setIsTraining(true);
    console.log('Starting AI model training with', data.length, 'samples');

    try {
      // Фильтруем данные с решениями модераторов
      const labeledData = data.filter(item => item.moderatorDecision);
      
      if (labeledData.length < MIN_TRAINING_SAMPLES) {
        console.log('Not enough labeled data for training');
        setIsTraining(false);
        return;
      }

      // Группируем данные по паттернам
      const patterns = {
        timePatterns: {} as Record<string, { correct: number; total: number }>,
        typePatterns: {} as Record<string, { correct: number; total: number }>,
        photoPatterns: { withPhoto: { correct: 0, total: 0 }, withoutPhoto: { correct: 0, total: 0 } },
        seasonPatterns: {} as Record<string, { correct: number; total: number }>
      };

      labeledData.forEach(item => {
        const wasCorrect = 
          (item.aiDecision === 'approve' && item.moderatorDecision === 'approved') ||
          (item.aiDecision === 'reject' && item.moderatorDecision === 'rejected');

        // Анализ по времени суток
        if (!patterns.timePatterns[item.timeOfDay]) {
          patterns.timePatterns[item.timeOfDay] = { correct: 0, total: 0 };
        }
        patterns.timePatterns[item.timeOfDay].total++;
        if (wasCorrect) patterns.timePatterns[item.timeOfDay].correct++;

        // Анализ по типу поста
        if (!patterns.typePatterns[item.postType]) {
          patterns.typePatterns[item.postType] = { correct: 0, total: 0 };
        }
        patterns.typePatterns[item.postType].total++;
        if (wasCorrect) patterns.typePatterns[item.postType].correct++;

        // Анализ по наличию фото
        const photoKey = item.hasPhoto ? 'withPhoto' : 'withoutPhoto';
        patterns.photoPatterns[photoKey].total++;
        if (wasCorrect) patterns.photoPatterns[photoKey].correct++;

        // Анализ по сезону
        if (!patterns.seasonPatterns[item.season]) {
          patterns.seasonPatterns[item.season] = { correct: 0, total: 0 };
        }
        patterns.seasonPatterns[item.season].total++;
        if (wasCorrect) patterns.seasonPatterns[item.season].correct++;
      });

      // Сохраняем паттерны для использования в будущих решениях
      await AsyncStorage.setItem('ai_learned_patterns', JSON.stringify(patterns));

      // Обновляем версию модели
      const newVersion = `1.${Math.floor(labeledData.length / 100)}.${labeledData.length % 100}`;
      const updatedStats: AIModelStats = {
        ...modelStats,
        lastTrainingDate: Date.now(),
        modelVersion: newVersion
      };

      setModelStats(updatedStats);
      await saveModelStats(updatedStats);
      lastSyncTimeRef.current = Date.now();

      console.log('AI model training completed. New version:', newVersion);
      console.log('Learned patterns:', patterns);
    } catch (error) {
      console.error('Error training AI model:', error);
    } finally {
      setIsTraining(false);
    }
  }, [isTraining, modelStats, saveModelStats]);

  // Запись решения ИИ
  const recordAIDecision = useCallback(
    async (
      post: DPSPost,
      aiDecision: 'approve' | 'reject',
      confidence: number
    ) => {
      const now = new Date();
      const newRecord: AITrainingData = {
        id: `training_${Date.now()}_${Math.random()}`,
        postId: post.id,
        postType: post.type,
        description: post.description.slice(0, 200),
        hasPhoto: !!post.photo,
        aiDecision,
        aiConfidence: confidence,
        timestamp: Date.now(),
        timeOfDay: getTimeOfDay(now.getHours()),
        season: getSeason(now.getMonth() + 1)
      };

      const updatedData = [...trainingData, newRecord];
      setTrainingData(updatedData);
      await saveTrainingData(updatedData);

      // Обновляем статистику
      const updatedStats = {
        ...modelStats,
        totalDecisions: modelStats.totalDecisions + 1
      };
      setModelStats(updatedStats);
      await saveModelStats(updatedStats);
    },
    [trainingData, modelStats, getTimeOfDay, getSeason, saveTrainingData, saveModelStats]
  );

  // Запись решения модератора
  const recordModeratorDecision = useCallback(
    async (postId: string, decision: 'approved' | 'rejected') => {
      const updatedData = trainingData.map(item => {
        if (item.postId === postId && !item.moderatorDecision) {
          const wasCorrect = 
            (item.aiDecision === 'approve' && decision === 'approved') ||
            (item.aiDecision === 'reject' && decision === 'rejected');

          // Обновляем статистику
          const updatedStats = {
            ...modelStats,
            correctDecisions: wasCorrect 
              ? modelStats.correctDecisions + 1 
              : modelStats.correctDecisions,
            falsePositives: !wasCorrect && item.aiDecision === 'approve'
              ? modelStats.falsePositives + 1
              : modelStats.falsePositives,
            falseNegatives: !wasCorrect && item.aiDecision === 'reject'
              ? modelStats.falseNegatives + 1
              : modelStats.falseNegatives,
            accuracy: modelStats.totalDecisions > 0
              ? ((wasCorrect ? modelStats.correctDecisions + 1 : modelStats.correctDecisions) / 
                 modelStats.totalDecisions) * 100
              : 0
          };
          setModelStats(updatedStats);
          saveModelStats(updatedStats);

          return { ...item, moderatorDecision: decision };
        }
        return item;
      });

      setTrainingData(updatedData);
      await saveTrainingData(updatedData);

      // Проверяем, нужно ли запустить обучение
      if (updatedData.length >= MIN_TRAINING_SAMPLES && 
          Date.now() - lastSyncTimeRef.current > TRAINING_INTERVAL) {
        await trainModelInternal(updatedData);
      }
    },
    [trainingData, modelStats, saveTrainingData, saveModelStats, trainModelInternal]
  );

  // Запись обратной связи от пользователя
  const recordUserFeedback = useCallback(
    async (postId: string, feedback: 'positive' | 'negative') => {
      const updatedData = trainingData.map(item => {
        if (item.postId === postId) {
          return { ...item, userFeedback: feedback };
        }
        return item;
      });

      setTrainingData(updatedData);
      await saveTrainingData(updatedData);
    },
    [trainingData, saveTrainingData]
  );

  // Получение улучшенного решения на основе обучения
  const getEnhancedDecision = useCallback(async (
    baseDecision: 'approve' | 'reject',
    confidence: number,
    postType: string,
    hasPhoto: boolean
  ): Promise<{ decision: 'approve' | 'reject'; confidence: number }> => {
    try {
      const patternsStr = await AsyncStorage.getItem('ai_learned_patterns');
      if (!patternsStr) return { decision: baseDecision, confidence };

      const patterns = JSON.parse(patternsStr);
      const now = new Date();
      const timeOfDay = getTimeOfDay(now.getHours());
      const season = getSeason(now.getMonth() + 1);

      // Корректируем уверенность на основе паттернов
      let adjustedConfidence = confidence;
      const adjustmentFactors: number[] = [];

      // Корректировка по времени суток
      if (patterns.timePatterns[timeOfDay]) {
        const timeAccuracy = patterns.timePatterns[timeOfDay].correct / patterns.timePatterns[timeOfDay].total;
        adjustmentFactors.push(timeAccuracy);
      }

      // Корректировка по типу поста
      if (patterns.typePatterns[postType]) {
        const typeAccuracy = patterns.typePatterns[postType].correct / patterns.typePatterns[postType].total;
        adjustmentFactors.push(typeAccuracy);
      }

      // Корректировка по наличию фото
      const photoKey = hasPhoto ? 'withPhoto' : 'withoutPhoto';
      if (patterns.photoPatterns[photoKey].total > 0) {
        const photoAccuracy = patterns.photoPatterns[photoKey].correct / patterns.photoPatterns[photoKey].total;
        adjustmentFactors.push(photoAccuracy);
      }

      // Корректировка по сезону
      if (patterns.seasonPatterns[season]) {
        const seasonAccuracy = patterns.seasonPatterns[season].correct / patterns.seasonPatterns[season].total;
        adjustmentFactors.push(seasonAccuracy);
      }

      // Вычисляем средний коэффициент корректировки
      if (adjustmentFactors.length > 0) {
        const avgAdjustment = adjustmentFactors.reduce((a, b) => a + b, 0) / adjustmentFactors.length;
        adjustedConfidence = confidence * avgAdjustment;

        // Если уверенность упала ниже 50%, меняем решение
        if (adjustedConfidence < 0.5 && baseDecision === 'approve') {
          return { decision: 'reject', confidence: 1 - adjustedConfidence };
        }
        if (adjustedConfidence < 0.5 && baseDecision === 'reject') {
          return { decision: 'approve', confidence: 1 - adjustedConfidence };
        }
      }

      return { decision: baseDecision, confidence: Math.min(adjustedConfidence, 1) };
    } catch (error) {
      console.error('Error getting enhanced decision:', error);
      return { decision: baseDecision, confidence };
    }
  }, [getTimeOfDay, getSeason]);

  // Функция для ручного запуска обучения
  const trainModel = useCallback(() => {
    return trainModelInternal(trainingData);
  }, [trainModelInternal, trainingData]);

  // Автоматическое обучение по расписанию
  useEffect(() => {
    const interval = setInterval(() => {
      const labeledData = trainingData.filter(item => item.moderatorDecision);
      if (labeledData.length >= MIN_TRAINING_SAMPLES && 
          Date.now() - lastSyncTimeRef.current > TRAINING_INTERVAL) {
        trainModelInternal(trainingData);
      }
    }, TRAINING_INTERVAL);

    return () => clearInterval(interval);
  }, [trainingData, trainModelInternal]);

  // Очистка старых данных
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentData = trainingData.filter(item => item.timestamp > oneWeekAgo);
      
      if (recentData.length < trainingData.length) {
        setTrainingData(recentData);
        saveTrainingData(recentData);
      }
    }, 24 * 60 * 60 * 1000); // Раз в день

    return () => clearInterval(cleanupInterval);
  }, [trainingData, saveTrainingData]);

  return useMemo(
    () => ({
      trainingData,
      modelStats,
      isTraining,
      recordAIDecision,
      recordModeratorDecision,
      recordUserFeedback,
      getEnhancedDecision,
      trainModel
    }),
    [
      trainingData,
      modelStats,
      isTraining,
      recordAIDecision,
      recordModeratorDecision,
      recordUserFeedback,
      getEnhancedDecision,
      trainModel
    ]
  );
});