import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useApp } from '@/hooks/app-store';
import { 
  Camera, 
  Edit2, 
  Check, 
  X, 
  Send, 
  MapPin,
  MessageSquare,
  Calendar,
  Shield,
  LogOut,
  User
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';



export default function ProfileScreen() {
  const { currentUser, updateUser, posts, messages, logoutUser, makeAdmin } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editTelegram, setEditTelegram] = useState(currentUser?.telegramUsername || '');

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  const openAdminPanel = () => {
    router.push('/admin');
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Ошибка', 'Имя не может быть пустым');
      return;
    }

    await updateUser({
      name: editName.trim(),
      telegramUsername: editTelegram.trim(),
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(currentUser?.name || '');
    setEditTelegram(currentUser?.telegramUsername || '');
    setIsEditing(false);
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Информация', 'Загрузка фото недоступна в веб-версии');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение для доступа к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await updateUser({
        avatar: result.assets[0].uri,
      });
    }
  };

  const openTelegramChannel = () => {
    const telegramUrl = 'https://t.me/nknewc';
    Linking.openURL(telegramUrl).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    });
  };



  const userPosts = posts.filter(post => post.userId === currentUser?.id);
  const userMessages = messages.filter(msg => msg.userId === currentUser?.id);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {currentUser?.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={32} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.cameraButton}>
            <Camera size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Имя"
              placeholderTextColor="#8E8E93"
              maxLength={30}
            />
            <TextInput
              style={styles.input}
              value={editTelegram}
              onChangeText={setEditTelegram}
              placeholder="Telegram @username"
              placeholderTextColor="#8E8E93"
              maxLength={30}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Check size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{currentUser?.name}</Text>
            {currentUser?.telegramUsername && (
              <Text style={styles.userHandle}>@{currentUser.telegramUsername}</Text>
            )}
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Edit2 size={16} color="#007AFF" />
              <Text style={styles.editBtnText}>Редактировать</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>



      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MapPin size={20} color="#007AFF" />
          <Text style={styles.statValue}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>Событий</Text>
        </View>
        <View style={styles.statCard}>
          <MessageSquare size={20} color="#34C759" />
          <Text style={styles.statValue}>{userMessages.length}</Text>
          <Text style={styles.statLabel}>Сообщений</Text>
        </View>
        <View style={styles.statCard}>
          <Calendar size={20} color="#FF9500" />
          <Text style={styles.statValue}>
            {Math.floor((Date.now() - parseInt(currentUser?.id || '0')) / (1000 * 60 * 60 * 24))}
          </Text>
          <Text style={styles.statLabel}>Дней</Text>
        </View>
      </View>



      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={openTelegramChannel}>
          <Send size={20} color="#0088CC" />
          <Text style={styles.actionText}>Telegram канал</Text>
        </TouchableOpacity>

        {(currentUser?.isAdmin || currentUser?.isModerator) ? (
          <TouchableOpacity style={styles.actionCard} onPress={openAdminPanel}>
            <Shield size={20} color="#FF9500" />
            <Text style={styles.actionText}>Админ панель</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              Alert.alert(
                'Получить права администратора?',
                'Это временная функция для тестирования',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Да', 
                    onPress: () => {
                      makeAdmin(currentUser?.id || '');
                      Alert.alert('Успешно', 'Вы получили права администратора');
                    }
                  }
                ]
              );
            }}
          >
            <Shield size={20} color="#8E8E93" />
            <Text style={styles.actionText}>Стать админом</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Версия 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  editBtnText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  editForm: {
    width: '80%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 24,
  },
});