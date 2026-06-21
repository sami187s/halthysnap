import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AIService } from '../services/aiService';
import { checkPremiumStatus } from '../utils/aiChatManager';

/**
 * Typing indicator — 3-dot animation
 */
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 150).start();
    animate(dot3, 300).start();
  }, []);

  const dotStyle = (anim) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.aiAvatar}>
        <Ionicons name="leaf" size={14} color="#2E7D32" />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
};

/**
 * Message bubble with slide-in animation
 */
const MessageBubble = ({ message, index }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const isUser = message.type === 'user';

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.userMessageRow : styles.aiMessageRow,
        {
          opacity: slideAnim,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [isUser ? 30 : -30, 0],
              }),
            },
          ],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons
            name={message.isError ? 'warning' : 'leaf'}
            size={14}
            color={message.isError ? '#C62828' : '#2E7D32'}
          />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          message.isError && styles.errorBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText,
            message.isError && styles.errorMessageText,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const ProductAIChat = ({ product, ingredients, analysis, visible = true, style = {}, onClose, initialQuestion = '' }) => {
  const navigation = useNavigation();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(null);
  const scrollViewRef = useRef(null);
  const sendBtnAnim = useRef(new Animated.Value(0)).current;
  const hasAutoSent = useRef(false);

  // Check premium status when component mounts or becomes visible
  useEffect(() => {
    checkPremiumStatus().then(status => setIsPremium(status));
  }, [visible]);

  // Build a clean string array of ingredient names so the AI always knows the product context
  const ingredientsList = (() => {
    // Prefer explicit ingredients prop (already strings)
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      return ingredients.map(i => (typeof i === 'string' ? i : i.name || '')).filter(Boolean);
    }
    // Fall back to analyzedIngredients from analysis (array of objects)
    const analyzed = analysis?.analyzedIngredients || [];
    if (analyzed.length > 0) {
      return analyzed.map(i => (typeof i === 'string' ? i : i.name || '')).filter(Boolean);
    }
    // Last resort: parse ingredients_text from product
    const raw = product?.ingredients_text || '';
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  })();

  // Reset conversation each time the chat is opened (new product session)
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setMessages([]);
      hasAutoSent.current = false;
    }
    prevVisible.current = visible;
  }, [visible]);

  // Auto-send initial question when chat opens
  useEffect(() => {
    if (visible && initialQuestion && initialQuestion.trim() && !hasAutoSent.current) {
      hasAutoSent.current = true;
      // Small delay to let the modal animate in
      setTimeout(() => {
        askAI(initialQuestion.trim());
      }, 400);
    }
    if (!visible) {
      hasAutoSent.current = false;
    }
  }, [visible, initialQuestion]);

  // Animate send button visibility
  useEffect(() => {
    Animated.timing(sendBtnAnim, {
      toValue: question.trim().length > 0 ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [question]);

  const starterPrompts = [
    { text: 'Is this safe to eat every day?', icon: 'calendar-outline' },
    { text: "What's the worst ingredient here?", icon: 'alert-circle-outline' },
    { text: 'Suggest a healthier alternative', icon: 'swap-horizontal-outline' },
    { text: 'How does this affect my goals?', icon: 'fitness-outline' },
  ];

  const handlePremiumGate = () => {};

  const askAI = async (questionText = question) => {
    if (!questionText.trim()) return;

    // AI chat is coming soon — show notice for everyone
    const userMessage = { type: 'user', text: questionText, timestamp: Date.now() };
    const comingSoonMsg = {
      type: 'ai',
      text: '✨ AI messaging is coming soon! You will be able to send messages here shortly. Stay tuned!',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage, comingSoonMsg]);
    setQuestion('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!visible) return null;

  const productName = product?.product_name || product?.name || 'Product';
  const score = analysis?.overallScore || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Context Bar — pinned product info */}
          <View style={styles.contextBar}>
            <View style={styles.contextLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              {product?.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.contextImage} />
              ) : (
                <View style={styles.contextImagePlaceholder}>
                  <Ionicons name="fast-food-outline" size={18} color="#888" />
                </View>
              )}
              <View style={styles.contextInfo}>
                <Text style={styles.contextName} numberOfLines={1}>{productName}</Text>
                <Text style={styles.contextScore}>{Math.round(score)}/100</Text>
              </View>
            </View>
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {messages.length === 0 && (
              <View style={styles.starterSection}>
                <View style={styles.starterIconWrap}>
                  <Ionicons name="sparkles" size={32} color="#7B61FF" />
                </View>
                <Text style={styles.starterTitle}>Ask me anything</Text>
                <Text style={styles.starterSubtitle}>
                  about {productName}
                </Text>

                {/* Premium lock notice for free users */}
                {isPremium === false && (
                  <View style={styles.premiumNotice}>
                    <Ionicons name="lock-closed" size={18} color="#7B61FF" />
                    <Text style={styles.premiumNoticeText}>Premium feature — subscribe to chat</Text>
                  </View>
                )}

                <View style={styles.promptsGrid}>
                  {starterPrompts.map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.promptChip}
                      onPress={() => askAI(prompt.text)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={prompt.icon} size={16} color="#7B61FF" style={styles.promptIcon} />
                      <Text style={styles.promptText}>{prompt.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} index={index} />
            ))}

            {loading && <TypingIndicator />}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask anything about this product..."
                placeholderTextColor="#999"
                multiline
                maxLength={250}
                returnKeyType="send"
                onSubmitEditing={() => askAI()}
                onFocus={() => {}}
              />
              <Animated.View
                style={[
                  styles.sendBtnWrap,
                  {
                    opacity: sendBtnAnim,
                    transform: [{ scale: sendBtnAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                  onPress={() => askAI()}
                  disabled={!question.trim() || loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },

  // Context bar
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 8,
  },
  contextImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 4,
  },
  contextImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  contextInfo: {
    marginLeft: 10,
    flex: 1,
  },
  contextName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  contextScore: {
    fontSize: 13,
    color: '#888888',
    marginTop: 1,
  },

  // Chat area
  chatArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  chatContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Starter section
  starterSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  starterIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  starterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  starterSubtitle: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 16,
  },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  premiumNoticeText: {
    fontSize: 14,
    color: '#7B61FF',
    fontWeight: '600',
  },
  promptsGrid: {
    width: '100%',
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  promptIcon: {
    marginRight: 12,
  },
  promptText: {
    fontSize: 15,
    color: '#3D3D3D',
    flex: 1,
  },

  // Message rows
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F8F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#2E7D32',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 6,
  },
  errorBubble: {
    backgroundColor: '#FFF0F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#1A1A1A',
  },
  errorMessageText: {
    color: '#C62828',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#888888',
    marginHorizontal: 2,
  },

  // Input bar
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1A1A1A',
    marginRight: 8,
  },
  sendBtnWrap: {
    marginBottom: 2,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

export default ProductAIChat;