import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useApp } from '@/hooks/app-store';
import { Send, User } from 'lucide-react-native';
import LoadingOverlay from '@/components/LoadingOverlay';



export default function ChatScreen() {
  const { messages, currentUser, addMessage } = useApp();
  const visibleMessages = messages.filter(msg => !msg.isDeleted);
  const [inputText, setInputText] = useState('');
  const [mutedMessage, setMutedMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new message arrives
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [visibleMessages]);



  const handleSend = async () => {
    if (inputText.trim() && !isSending) {
      const messageText = inputText.trim();
      
      // Проверяем, не заглушен ли пользователь
      if (currentUser?.isMuted && currentUser.mutedUntil && currentUser.mutedUntil > Date.now()) {
        const remainingTime = Math.ceil((currentUser.mutedUntil - Date.now()) / (1000 * 60));
        setMutedMessage(`Вы заглушены еще на ${remainingTime} мин.`);
        setTimeout(() => setMutedMessage(''), 3000);
        return;
      }
      
      setIsSending(true);
      try {
        const success = addMessage(messageText);
        if (success) {
          setInputText('');
          Keyboard.dismiss();
        }
      } finally {
        setIsSending(false);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(visibleMessages[index].timestamp).toDateString();
    const previousDate = new Date(visibleMessages[index - 1].timestamp).toDateString();
    
    return currentDate !== previousDate;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleMessages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Начните общение</Text>
              <Text style={styles.emptySubtext}>
                Делитесь информацией о постах ДПС и помогайте друг другу
              </Text>
            </View>
          ) : (
            visibleMessages.map((message, index) => (
              <View key={message.id}>
                {shouldShowDate(index) && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateText}>
                      {formatDate(message.timestamp)}
                    </Text>
                  </View>
                )}
                
                <View
                  style={[
                    styles.messageWrapper,
                    message.userId === currentUser?.id && styles.messageWrapperOwn
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.userId === currentUser?.id && styles.messageBubbleOwn
                    ]}
                  >
                    
                    {message.userId !== currentUser?.id && (
                      <View style={styles.messageHeader}>
                        <User size={14} color="#007AFF" />
                        <Text style={styles.userName}>{message.userName}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        message.userId === currentUser?.id && styles.messageTextOwn
                      ]}
                    >
                      {message.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        message.userId === currentUser?.id && styles.messageTimeOwn
                      ]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          {mutedMessage ? (
            <View style={styles.mutedContainer}>
              <Text style={styles.mutedText}>{mutedMessage}</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Написать сообщение..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!currentUser?.isMuted || !currentUser.mutedUntil || currentUser.mutedUntil <= Date.now()}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || (currentUser?.isMuted && currentUser.mutedUntil && currentUser.mutedUntil > Date.now())) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || Boolean(currentUser?.isMuted && currentUser.mutedUntil && currentUser.mutedUntil > Date.now())}
              >
                <Send size={20} color={(inputText.trim() && (!currentUser?.isMuted || !currentUser.mutedUntil || currentUser.mutedUntil <= Date.now())) ? "#FFFFFF" : "#C7C7CC"} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <LoadingOverlay
        visible={isSending}
        label="Отправка сообщения..."
        testID="chat-sending-loading"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 180,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8E8E93',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateText: {
    fontSize: 13,
    color: '#8E8E93',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageWrapper: {
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  messageWrapperOwn: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    maxWidth: '85%',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  messageBubbleOwn: {
    backgroundColor: '#007AFF',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  messageText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'flex-end',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    maxHeight: 120,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  mutedContainer: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  mutedText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
});