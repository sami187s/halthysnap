/**
 * Food Photo Results Screen
 * Displays AI recognition results and nutrition analysis for photographed food
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../components/shared/ScreenWrapper';
import ScreenHeader from '../components/shared/ScreenHeader';
import clarifaiAPI from '../services/clarifaiAPI';
import usdaAPI from '../services/usdaAPI';
import { getQuestionsForFood, needsQuestions } from '../data/foodQuestions';
import {
  calculateFoodScore,
  getScoreEmoji
} from '../utils/foodPhotoScoring';

const { width } = Dimensions.get('window');

const FoodPhotoResultsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { imageUri } = route.params;

  // 🛠️ DEV MODE: Pre-built mock data (bypasses AI recognition & USDA API)
  const devFoodData = route?.params?.devFoodData || null;
  const devNutritionData = route?.params?.devNutritionData || null;
  const devScoreData = route?.params?.devScoreData || null;

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [foodData, setFoodData] = useState(null);
  const [nutritionData, setNutritionData] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [foodNameInput, setFoodNameInput] = useState('');
  const [aiRecognitionAttempted, setAiRecognitionAttempted] = useState(false);
  
  // NEW: Question flow state
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [recognizedFoodName, setRecognizedFoodName] = useState('');

  useEffect(() => {
    if (devFoodData && devNutritionData && devScoreData) {
      // 🛠️ DEV MODE: load mock data directly
      setFoodData(devFoodData);
      setNutritionData(devNutritionData);
      setScoreData(devScoreData);
      setAiRecognitionAttempted(true);
    } else {
      // Try AI recognition first
      tryAIRecognition();
    }
  }, []);

  const tryAIRecognition = async () => {
    try {
      setLoading(true);
      setAnalyzing(true);
      console.log('🤖 Attempting AI food recognition...');

      const recognition = await clarifaiAPI.recognizeFood(imageUri);
      setAiRecognitionAttempted(true);

      if (recognition.error || recognition.confidence < 0.3) {
        // AI failed, ask user to type
        console.log('⚠️ AI recognition failed, asking user for input');
        setFoodNameInput(recognition.foodName || 'Hamburger');
        setShowInputModal(true);
        setLoading(false);
        setAnalyzing(false);
      } else {
        // AI succeeded! Check if questions needed
        console.log('✅ AI recognized:', recognition.foodName, 'confidence:', recognition.confidence);
        setRecognizedFoodName(recognition.foodName);
        setFoodData(recognition);
        
        // Check if this food needs questions
        if (needsQuestions(recognition.foodName)) {
          console.log('❓ Food needs questions - showing question flow');
          const foodQuestions = getQuestionsForFood(recognition.foodName);
          setQuestions(foodQuestions);
          setCurrentQuestionIndex(0);
          setUserAnswers({});
          setShowQuestions(true);
          setLoading(false);
          setAnalyzing(false);
        } else {
          // No questions needed - analyze immediately
          console.log('✅ No questions needed - analyzing directly');
          await analyzeFoodWithAnswers(recognition.foodName, {});
        }
      }
    } catch (err) {
      console.error('❌ AI recognition error:', err);
      // Fallback to manual input
      setShowInputModal(true);
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const promptUserForFoodName = () => {
    setFoodNameInput(foodData?.foodName || 'Hamburger');
    setShowInputModal(true);
  };

  // NEW: Handle user answer to question
  const handleAnswer = (answer) => {
    const currentQ = questions[currentQuestionIndex];
    const newAnswers = {
      ...userAnswers,
      [currentQ.id]: answer
    };
    setUserAnswers(newAnswers);
    
    console.log(`✅ Answered "${currentQ.question}": ${answer}`);
    
    if (currentQuestionIndex < questions.length - 1) {
      // More questions - go to next
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - analyze!
      console.log('✅ All questions answered:', newAnswers);
      setShowQuestions(false);
      analyzeFoodWithAnswers(recognizedFoodName, newAnswers);
    }
  };

  // NEW: Analyze food with user answers
  const analyzeFoodWithAnswers = async (foodName, answers) => {
    try {
      setLoading(true);
      setAnalyzing(true);
      setError(null);
      
      console.log('📸 Analyzing food with answers...');
      console.log('🍽️ Food:', foodName);
      console.log('📋 Answers:', answers);

      // Use enhanced USDA search
      const nutrition = await usdaAPI.searchFoodEnhanced(foodName, answers);
      console.log('✅ Enhanced nutrition data:', nutrition);
      setNutritionData(nutrition);

      // Calculate health score
      console.log('📊 Calculating health score...');
      const score = calculateFoodScore(nutrition);
      setScoreData(score);
      console.log('✅ Health score:', score.score);

      setLoading(false);
      setAnalyzing(false);

    } catch (err) {
      console.error('❌ Food analysis error:', err);
      setError(err.message || 'Failed to analyze food. Please try again.');
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const analyzeFoodByName = async (foodName) => {
    try {
      console.log('📸 Manual food entry:', foodName);
      
      // Set food data
      setRecognizedFoodName(foodName);
      setFoodData({
        foodName: foodName,
        confidence: 1.0,
        alternatives: []
      });

      // Check if this food needs questions
      if (needsQuestions(foodName)) {
        console.log('❓ Food needs questions - showing question flow');
        const foodQuestions = getQuestionsForFood(foodName);
        setQuestions(foodQuestions);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowQuestions(true);
      } else {
        // No questions needed - analyze immediately
        console.log('✅ No questions needed - analyzing directly');
        await analyzeFoodWithAnswers(foodName, {});
      }

    } catch (err) {
      console.error('❌ Food analysis error:', err);
      setError(err.message || 'Failed to analyze food. Please try again.');
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const analyzeFoodPhoto = async () => {
    try {
      setAnalyzing(true);
      console.log('📸 Starting food photo analysis...');

      // Step 1: Recognize food
      console.log('🤖 Step 1: Recognizing food...');
      const recognition = await clarifaiAPI.recognizeFood(imageUri);
      
      if (!clarifaiAPI.isConfidenceAcceptable(recognition.confidence)) {
        throw new Error('Low confidence in food recognition. Please try a clearer photo.');
      }

      setFoodData(recognition);
      console.log('✅ Food recognized:', recognition.foodName);

      // Step 2: Get nutrition from USDA
      console.log('🥗 Step 2: Fetching nutrition data...');
      const nutrition = await usdaAPI.searchFood(recognition.foodName);
      setNutritionData(nutrition);
      console.log('✅ Nutrition data retrieved');

      // Step 3: Calculate health score
      console.log('📊 Step 3: Calculating health score...');
      const score = calculateFoodScore(nutrition);
      setScoreData(score);
      console.log('✅ Health score:', score.score);

      setLoading(false);
      setAnalyzing(false);

    } catch (err) {
      console.error('❌ Food analysis error:', err);
      setError(err.message || 'Failed to analyze food. Please try again.');
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleScanAnother = () => {
    navigation.goBack();
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  // NEW: Show questions screen
  if (showQuestions && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    return (
      <ScreenWrapper>
        <ScreenHeader title="Tell us more" onBack={() => {
            setShowQuestions(false);
            navigation.goBack();
          }} />

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.questionContent}>
          {/* Food preview */}
          <View style={styles.foodPreviewCard}>
            <Image source={{ uri: imageUri }} style={styles.foodPreviewImage} />
            <View style={styles.foodPreviewText}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.foodPreviewName}>{recognizedFoodName}</Text>
            </View>
          </View>

          {/* Question card */}
          <View style={styles.questionCard}>
            <Ionicons name="help-circle" size={32} color="#4CAF50" />
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            
            {/* Answer options */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{option}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Why we ask */}
          <View style={styles.whyAskCard}>
            <Ionicons name="information-circle-outline" size={18} color="#FF9800" />
            <Text style={styles.whyAskText}>
              These questions help us calculate accurate nutrition and health scores for your specific meal.
            </Text>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // Show input modal first
  if (showInputModal) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Food Analysis" onBack={() => navigation.goBack()} />

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="restaurant" size={60} color="#4CAF50" />
          <Text style={styles.inputTitle}>What food is this?</Text>
          <Text style={styles.inputSubtext}>
            Enter the name of the food (e.g., burger, salad, pasta)
          </Text>
          
          <TextInput
            style={styles.foodInput}
            value={foodNameInput}
            onChangeText={setFoodNameInput}
            placeholder="Enter food name"
            autoFocus={true}
            autoCapitalize="words"
            onSubmitEditing={() => {
              if (foodNameInput && foodNameInput.trim()) {
                setShowInputModal(false);
                analyzeFoodByName(foodNameInput.trim());
              } else {
                Alert.alert('Error', 'Please enter a food name');
              }
            }}
          />

          <View style={styles.inputButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={() => {
                if (foodNameInput && foodNameInput.trim()) {
                  setShowInputModal(false);
                  analyzeFoodByName(foodNameInput.trim());
                } else {
                  Alert.alert('Error', 'Please enter a food name');
                }
              }}
            >
              <Text style={styles.analyzeButtonText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Analyzing Food..." onBack={handleGoHome} />

        <View style={styles.loadingContainer}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.loadingImage} />
          )}
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          <Text style={styles.loadingText}>
            {analyzing ? '🤖 AI is analyzing your food...' : 'Getting nutrition data...'}
          </Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Analysis Failed" onBack={handleGoHome} />

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color="#F44336" />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={analyzeFoodPhoto}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Success state - only render if we have data
  if (!foodData || !nutritionData || !scoreData) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Food Analysis" onBack={handleGoHome} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Preparing analysis...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScreenHeader title="Food Analysis" onBack={handleGoHome} />

      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && { overflow: 'scroll' }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Food Photo */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.foodImage} />
        </View>

        {/* Recognition Result */}
        <View style={styles.recognitionCard}>
          <View style={styles.recognitionHeader}>
            <Ionicons name="restaurant" size={28} color="#4CAF50" />
            <View style={styles.recognitionTextContainer}>
              <Text style={styles.recognitionLabel}>Food Item:</Text>
              <Text style={styles.recognitionFoodName}>{foodData?.foodName || 'Unknown Food'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={promptUserForFoodName}
          >
            <Ionicons name="create-outline" size={16} color="#4CAF50" />
            <Text style={styles.editButtonText}>Change Food Name</Text>
          </TouchableOpacity>
        </View>

        {/* Score Badge */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { borderColor: scoreData.color }]}>
            <Text style={[styles.scoreNumber, { color: scoreData.color }]}>
              {scoreData.score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreGrade, { color: scoreData.color }]}>
              {scoreData.grade} <Ionicons name={getScoreEmoji(scoreData.score).icon} size={20} color={getScoreEmoji(scoreData.score).color} />
            </Text>
            <Text style={styles.scoreDescription}>
              {scoreData.score >= 70
                ? 'Great choice! This food is healthy.'
                : scoreData.score >= 40
                ? 'Moderate option. Consume in moderation.'
                : 'Not the healthiest choice. Consider alternatives.'}
            </Text>
          </View>
        </View>



        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleScanAnother}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Scan Another</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButtonOutline} onPress={handleGoHome}>
            <Ionicons name="home" size={20} color="#4CAF50" />
            <Text style={styles.secondaryButtonTextOutline}>Go Home</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    marginBottom: 30
  },
  loader: {
    marginBottom: 16
  },
  loadingText: {
    fontSize: 18,
    color: '#1B5E20',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center'
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 20,
    marginBottom: 10
  },
  errorMessage: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 30
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 12
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },

  // Input screen styles
  previewImage: {
    width: width * 0.9,
    height: width * 0.6,
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 16,
    resizeMode: 'cover'
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  inputTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center'
  },
  inputSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 30
  },
  foodInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F9F9F9'
  },
  inputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575'
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 16,
    marginLeft: 8,
    alignItems: 'center'
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },

  // Image
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16
  },
  foodImage: {
    width: width * 0.9,
    height: width * 0.7,
    borderRadius: 16,
    resizeMode: 'cover'
  },

  // Recognition Card
  recognitionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  recognitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  recognitionTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  recognitionLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4
  },
  recognitionFoodName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    textTransform: 'capitalize'
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  editButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6
  },
  recognitionConfidence: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600'
  },
  estimatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 8
  },
  estimatedText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 6
  },

  // Score
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  scoreBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: 'bold'
  },
  scoreMax: {
    fontSize: 16,
    color: '#757575'
  },
  scoreInfo: {
    flex: 1
  },
  scoreGrade: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  scoreDescription: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20
  },

  // Nutrition Card
  nutritionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8
  },
  nutritionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  nutritionLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  nutritionLabel: {
    fontSize: 15,
    color: '#1B5E20',
    marginLeft: 10
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B5E20'
  },
  positiveValue: {
    color: '#4CAF50'
  },
  negativeValue: {
    color: '#F44336'
  },

  // Analysis Card
  analysisCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  analysisSection: {
    marginTop: 12
  },
  analysisHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 8
  },
  analysisPoint: {
    fontSize: 14,
    color: '#4CAF50',
    lineHeight: 22,
    marginLeft: 8
  },
  analysisPointNegative: {
    fontSize: 14,
    color: '#F44336',
    lineHeight: 22,
    marginLeft: 8
  },

  // Action Buttons
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 8
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  secondaryButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  secondaryButtonOutline: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  secondaryButtonTextOutline: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },

  // NEW: Question flow styles
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3
  },
  progressText: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center'
  },
  questionContent: {
    padding: 20
  },
  foodPreviewCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  foodPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12
  },
  foodPreviewText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  foodPreviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
    textTransform: 'capitalize'
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center'
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24
  },
  optionsContainer: {
    width: '100%'
  },
  optionButton: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    flex: 1
  },
  whyAskCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  whyAskText: {
    fontSize: 13,
    color: '#757575',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  }
});

export default FoodPhotoResultsScreen;
