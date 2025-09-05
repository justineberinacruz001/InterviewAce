let isRecognitionActive = false;

document.addEventListener("DOMContentLoaded", () => {
    // Error handling utilities - Priority 1
    function safeExecute(fn, fallback = () => {}) {
        try {
            return fn();
        } catch (error) {
            console.error('Safe execution failed:', error);
            return fallback();
        }
    }
    

    function safeExecuteWithFeedback(fn, fallback = () => {}, errorMessage = "An error occurred") {
        try {
            return fn();
        } catch (error) {
            console.error('Safe execution failed:', error);
            showErrorMessage(errorMessage);
            return fallback();
        }
    }

    function showErrorMessage(message) {
        let errorDiv = document.getElementById('globalErrorDisplay');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'globalErrorDisplay';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            if (errorDiv) errorDiv.style.display = 'none';
        }, 5000);
    }

    // Safe storage functions - Priority 3
    let memoryStorage = {};

    function saveToStorage(key, value) {
        try {
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem(key, value);
            } else {
                memoryStorage[key] = value;
            }
        } catch (error) {
            memoryStorage[key] = value;
        }
    }

    function loadFromStorage(key) {
        try {
            if (typeof(Storage) !== "undefined") {
                return localStorage.getItem(key);
            } else {
                return memoryStorage[key];
            }
        } catch (error) {
            return memoryStorage[key];
        }
    }

    // Question Database with categories
    const questionsByCategory = {
        'fresh-grad': [
            { text: "Tell me about yourself and your educational background", difficulty: "easy" },
            { text: "Why did you choose your major?", difficulty: "easy" },
            { text: "What are your career goals?", difficulty: "medium" },
            { text: "How do you handle learning new technologies?", difficulty: "medium" },
            { text: "Describe a challenging project from your studies", difficulty: "medium" },
            { text: "What makes you a good fit despite lacking experience?", difficulty: "hard" },
            { text: "How do you prioritize when everything is new to you?", difficulty: "hard" },
            { text: "What internships or volunteer work have you done?", difficulty: "easy" },
            { text: "How do you stay updated with industry trends?", difficulty: "medium" },
            { text: "What skills from university will help you in this role?", difficulty: "medium" }
        ],
        'experienced': [
            { text: "Walk me through your professional journey", difficulty: "easy" },
            { text: "What achievements are you most proud of?", difficulty: "medium" },
            { text: "Why are you looking to leave your current position?", difficulty: "medium" },
            { text: "How do you handle conflicts with team members?", difficulty: "medium" },
            { text: "Describe a time you led a project to success", difficulty: "hard" },
            { text: "What's your approach to mentoring junior colleagues?", difficulty: "medium" },
            { text: "How do you balance multiple priorities?", difficulty: "medium" },
            { text: "Tell me about a time you failed and what you learned", difficulty: "hard" },
            { text: "How do you measure your own performance?", difficulty: "medium" },
            { text: "What management style works best for you?", difficulty: "easy" },
            { text: "Describe your ideal work environment", difficulty: "easy" },
            { text: "How do you handle tight deadlines?", difficulty: "medium" }
        ],
        'senior': [
            { text: "What's your leadership philosophy?", difficulty: "medium" },
            { text: "How do you build and maintain high-performing teams?", difficulty: "hard" },
            { text: "Describe your experience with strategic planning", difficulty: "hard" },
            { text: "How do you handle underperforming team members?", difficulty: "hard" },
            { text: "What's your approach to stakeholder management?", difficulty: "hard" },
            { text: "How do you drive organizational change?", difficulty: "hard" },
            { text: "Describe your budget management experience", difficulty: "medium" },
            { text: "How do you balance short-term results with long-term vision?", difficulty: "hard" },
            { text: "What's your approach to risk management?", difficulty: "medium" },
            { text: "How do you develop talent within your organization?", difficulty: "medium" }
        ],
        'career-change': [
            { text: "Why are you changing careers at this stage?", difficulty: "medium" },
            { text: "What transferable skills do you bring?", difficulty: "medium" },
            { text: "How does your previous experience relate to this role?", difficulty: "hard" },
            { text: "What motivated this career transition?", difficulty: "easy" },
            { text: "How have you prepared for this career change?", difficulty: "medium" },
            { text: "What challenges do you anticipate in this transition?", difficulty: "hard" },
            { text: "How do you plan to get up to speed quickly?", difficulty: "medium" },
            { text: "What attracted you to this new industry?", difficulty: "easy" },
            { text: "How will you leverage your unique background?", difficulty: "hard" },
            { text: "What have you done to learn about this new field?", difficulty: "medium" }
        ]
    };

    // General questions for all categories
    const generalQuestions = [
        { text: "Tell me about yourself", difficulty: "easy" },
        { text: "Why do you want to work here?", difficulty: "easy" },
        { text: "What are your greatest strengths?", difficulty: "easy" },
        { text: "What is your biggest weakness?", difficulty: "medium" },
        { text: "Where do you see yourself in 5 years?", difficulty: "medium" },
        { text: "Describe a challenging situation and how you handled it", difficulty: "medium" },
        { text: "Tell me about a time you failed", difficulty: "hard" },
        { text: "How do you handle stress and pressure?", difficulty: "medium" },
        { text: "What motivates you?", difficulty: "easy" },
        { text: "Why should we hire you?", difficulty: "medium" }
    ];

    // Global state
    let currentCategory = null;
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let interviewActive = false;
    let answers = [];
    let scores = [];
    let timerInterval = null;
    let startTime = null;
    let recognition = null;
    let isRecording = false;
    let finalTranscript = '';
    let recognitionTimeout = null;
    let synthesis = null;
    let isSinglePractice = false;
    let selectedQuestion = null;

    // Progress tracking
    let progressData = {
        interviews: [],
        totalQuestions: 0,
        totalTime: 0
    };

    // Initialize Text-to-Speech
    function initTextToSpeech() {
        if ('speechSynthesis' in window) {
            synthesis = window.speechSynthesis;
        } else {
            console.warn('Text-to-Speech not supported');
        }
    }

    // HR Voice Helper Functions - Priority 2
    function speakHRMessage(message, showIndicator = true) {
        safeExecuteWithFeedback(() => {
            if (!synthesis) return;
            
            const utterance = new SpeechSynthesisUtterance(message);
            
            const voices = synthesis.getVoices();
            const preferredVoices = [
                'Google US English', 'Microsoft Zira', 'Microsoft David',
                'Alex', 'Samantha', 'Daniel', 'Karen', 'Moira',
                'Tessa', 'Veena', 'Victoria', 'Google UK English Female'
            ];
            
            for (let preferred of preferredVoices) {
                const voice = voices.find(v => v.name.includes(preferred));
                if (voice) {
                    utterance.voice = voice;
                    break;
                }
            }
            
            if (!utterance.voice) {
                const englishVoice = voices.find(v => v.lang.startsWith('en'));
                if (englishVoice) utterance.voice = englishVoice;
            }
            
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            if (showIndicator) {
                const indicator = document.getElementById('hrSpeakingIndicator');
                if (indicator) {
                    indicator.style.display = 'flex';
                    
                    utterance.onend = () => {
                        safeExecute(() => {
                            indicator.style.display = 'none';
                        });
                    };
                }
            }
            
            synthesis.speak(utterance);
        }, () => {
            console.warn('Text-to-speech failed');
        }, "Text-to-speech is currently unavailable");
    }

    function getHRTransition() {
        const transitions = [
            "Thank you for that answer. Let's move on to the next question.",
            "I appreciate your response. Here's another question for you.",
            "That's interesting. Now, let me ask you this.",
            "Great, thank you. Moving forward...",
            "Thanks for sharing that. Let's continue with...",
            "I see, thanks for explaining. Next question..."
        ];
        return transitions[Math.floor(Math.random() * transitions.length)];
    }

    // Initialize speech recognition with improved settings - Priority 2
    function initSpeechRecognition() {
    safeExecuteWithFeedback(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onstart = function() {
                console.log('Voice recognition started');
                isRecognitionActive = true;
                updateVoiceStatus('Listening... Speak clearly into your microphone', false);
                clearTimeout(recognitionTimeout);
            };

            recognition.onresult = function(event) {
                safeExecute(() => {
                    let interimTranscript = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                            clearTimeout(recognitionTimeout);
                            
                            if (isRecording) {
                                recognitionTimeout = setTimeout(() => {
                                    if (isRecording && !isRecognitionActive) {
                                        safeExecute(() => recognition.start());
                                    }
                                }, 100);
                            }
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    
                    const answerBox = document.getElementById('answerBox');
                    if (answerBox) {
                        answerBox.value = finalTranscript + interimTranscript;
                        answerBox.style.height = 'auto';
                        answerBox.style.height = answerBox.scrollHeight + 'px';
                    }
                    
                    updateVoiceStatus('Capturing your response...', false);
                });
            };

            recognition.onerror = function(event) {
                safeExecute(() => {
                    console.error('Speech recognition error:', event.error);
                    isRecognitionActive = false;
                    let errorMessage = 'Voice recognition error: ';
                    
                    switch(event.error) {
                        case 'network':
                            errorMessage += 'Network connection issue';
                            break;
                        case 'not-allowed':
                            errorMessage += 'Microphone access denied';
                            break;
                        case 'no-speech':
                            errorMessage += 'No speech detected - try speaking louder';
                            if (isRecording && !isRecognitionActive) {
                                setTimeout(() => {
                                    if (isRecording && !isRecognitionActive) {
                                        safeExecute(() => recognition.start());
                                    }
                                }, 100);
                                return;
                            }
                            break;
                        case 'audio-capture':
                            errorMessage += 'No microphone found';
                            break;
                        default:
                            errorMessage += event.error;
                    }
                    
                    if (event.error !== 'no-speech') {
                        updateVoiceStatus(errorMessage, true);
                        stopVoiceRecording();
                    }
                });
            };

            recognition.onend = function() {
                safeExecute(() => {
                    console.log('Voice recognition ended');
                    isRecognitionActive = false;
                    clearTimeout(recognitionTimeout);
                    
                    // Only restart if we're supposed to be recording
                    if (isRecording && !isRecognitionActive) {
                        setTimeout(() => {
                            if (isRecording && !isRecognitionActive) {
                                safeExecute(() => recognition.start());
                            }
                        }, 100);
                    }
                });
            };
        }
    }, () => {
        console.warn('Speech Recognition not supported');
    }, "Voice recognition could not be initialized. Please check your browser compatibility.");
}

    // Update voice status display
    function updateVoiceStatus(message, isError = false) {
        const statusDiv = document.getElementById('voiceStatus');
        if (statusDiv) {
            statusDiv.className = isError ? 'voice-status error' : 'voice-status';
            statusDiv.textContent = message;
            statusDiv.style.display = message ? 'inline-block' : 'none';
        }
    }

    // Category selection
    function selectCategory(category) {
        currentCategory = category;
        
        document.querySelectorAll('.category-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('selected');
        
        document.getElementById('currentQuestion').textContent = 
            `Profile selected: ${getCategoryName(category)}. Click "Start Interview" to begin`;
    }

    function getCategoryName(category) {
        const names = {
            'fresh-grad': 'Fresh Graduate',
            'experienced': 'Experienced Professional',
            'senior': 'Senior Level',
            'career-change': 'Career Change'
        };
        return names[category] || category;
    }

    // Navigation - Priority 2
    function showSection(sectionId, event = null) {
        safeExecuteWithFeedback(() => {
            document.querySelectorAll('.main-content').forEach(section => {
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            } else {
                throw new Error(`Section with id '${sectionId}' not found`);
            }
            
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            if (sectionId === 'practice') {
                safeExecute(() => loadQuestions());
            } else if (sectionId === 'progress') {
                safeExecute(() => updateProgress());
            }
        }, () => {
            console.warn(`Could not show section: ${sectionId}`);
        }, `Navigation error: Could not switch to ${sectionId} section`);
    }

    // Start Interview with HR Voice
    function startInterview() {
        if (!isSinglePractice && !currentCategory) {
            alert('Please select an interview profile first');
            return;
        }
        
        interviewActive = true;
        currentQuestionIndex = 0;
        answers = [];
        scores = [];
        finalTranscript = '';
        
        if (isSinglePractice && selectedQuestion) {
            currentQuestions = [selectedQuestion];
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('endBtn').textContent = 'Finish Practice';
        } else {
            const categoryQuestions = questionsByCategory[currentCategory] || [];
            const mixedQuestions = [
                ...categoryQuestions.slice(0, 7),
                ...generalQuestions.slice(0, 3)
            ].sort(() => Math.random() - 0.5);
            
            currentQuestions = mixedQuestions.slice(0, 10);
            document.getElementById('nextBtn').style.display = 'inline-block';
            document.getElementById('endBtn').textContent = 'End Interview';
        }
        
        document.getElementById('interviewSetup').style.display = 'none';
        document.getElementById('startBtn').disabled = true;
        document.getElementById('voiceBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('endBtn').disabled = false;
        document.getElementById('feedbackSection').style.display = 'none';
        document.getElementById('answerBox').value = '';
        
        setTimeout(() => {
            displayQuestion(currentQuestions[currentQuestionIndex]);
            speakHRMessage(currentQuestions[currentQuestionIndex].text);
        }, 3000);
        
        startTimer();
        updateProgressBar();
    }

    // Display current question
    function displayQuestion(question) {
        document.getElementById('currentQuestion').textContent = question.text;
    }

    // Next Question with HR transition
    function nextQuestion() {
        const answer = document.getElementById('answerBox').value;
        
        if (answer.trim()) {
            answers.push(answer);
            scores.push(evaluateAnswer(answer));
        }
        
        currentQuestionIndex++;
        
        if (currentQuestionIndex < currentQuestions.length) {
            const transition = getHRTransition();
            speakHRMessage(transition);
            
            document.getElementById('answerBox').value = '';
            finalTranscript = '';
            
            setTimeout(() => {
                displayQuestion(currentQuestions[currentQuestionIndex]);
                speakHRMessage(currentQuestions[currentQuestionIndex].text);
            }, 3000);
            
            updateProgressBar();
        } else {
            endInterview();
        }
    }

    // End Interview with HR closing
    function endInterview() {
        if (!interviewActive) return;
        
        const answer = document.getElementById('answerBox').value;
        if (answer.trim() && currentQuestionIndex < currentQuestions.length) {
            answers.push(answer);
            scores.push(evaluateAnswer(answer));
        }
        
        interviewActive = false;
        stopTimer();
        stopVoiceRecording();
        
        if (answers.length > 0) {
            const closingMessages = [
                "Thank you so much for your time today. You did a great job! Let me provide you with some feedback.",
                "That concludes our interview. I appreciate your thoughtful responses. Here's your performance summary.",
                "Excellent work today! Thank you for sharing your experiences with me. Let's review how you did."
            ];
            const closing = closingMessages[Math.floor(Math.random() * closingMessages.length)];
            speakHRMessage(closing, false);
        }
        
        isSinglePractice = false;
        selectedQuestion = null;
        document.getElementById('nextBtn').style.display = 'inline-block';
        
        document.getElementById('interviewSetup').style.display = 'block';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('voiceBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        document.getElementById('endBtn').disabled = true;
        
        document.getElementById('currentQuestion').textContent = 
            'Select your profile and click "Start Interview" to begin';
        
        document.getElementById('answerBox').value = '';
        
        if (answers.length > 0) {
            showFeedback();
            saveProgress();
        }
        
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressBar').textContent = '0%';
        
        updateVoiceStatus('', false);
        
        document.querySelectorAll('.category-option').forEach(option => {
            option.classList.remove('selected');
        });
        currentCategory = null;
    }

    // Voice Controls - Priority 2
    function toggleVoice() {
        if (!recognition) {
            alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        
        if (isRecording) {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    }

    function startVoiceRecording() {
    safeExecuteWithFeedback(() => {
        if (!recognition) {
            throw new Error('Speech recognition not available');
        }
        
        // Don't start if already active
        if (isRecognitionActive) {
            console.log('Recognition already active, skipping start');
            return;
        }
        
        finalTranscript = document.getElementById('answerBox').value || '';
        recognition.start();
        isRecording = true;
        
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');
        
        if (voiceIndicator) voiceIndicator.classList.add('active');
        if (voiceBtn) {
            voiceBtn.textContent = '🔴 Stop Speaking';
            voiceBtn.classList.remove('btn-success');
            voiceBtn.classList.add('btn-danger');
        }
        
        updateVoiceStatus('Initializing microphone...', false);
    }, () => {
        isRecording = false;
        isRecognitionActive = false;
        updateVoiceStatus('Voice recording failed to start', true);
    }, "Could not start voice recording. Please check your microphone permissions.");
}

function stopVoiceRecording() {
    isRecording = false;
    isRecognitionActive = false;
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
    
    clearTimeout(recognitionTimeout);
    
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceIndicator = document.getElementById('voiceIndicator');
    
    if (voiceIndicator) voiceIndicator.classList.remove('active');
    if (voiceBtn) {
        voiceBtn.textContent = '🎤 Start Speaking';
        voiceBtn.classList.remove('btn-danger');
        voiceBtn.classList.add('btn-success');
    }
    
    updateVoiceStatus('', false);
}

    // Timer functions
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // Progress bar
    function updateProgressBar() {
        const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = progress + '%';
        progressBar.textContent = Math.round(progress) + '%';
    }

    // Evaluate answer
    function evaluateAnswer(answer) {
        let score = 0;
        
        if (answer.length > 200) score += 30;
        else if (answer.length > 100) score += 20;
        else if (answer.length > 50) score += 10;
        
        const keywords = ['experience', 'skills', 'achieved', 'learned', 'team', 
                        'goal', 'result', 'challenge', 'solution', 'improved'];
        keywords.forEach(keyword => {
            if (answer.toLowerCase().includes(keyword)) score += 7;
        });
        
        return Math.min(score, 100);
    }

    // Show feedback
    function showFeedback() {
        const avgScore = scores.length > 0 ? 
            Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        
        document.getElementById('scoreDisplay').textContent = avgScore + '%';
        
        const tips = generateTips(avgScore);
        document.getElementById('tipsList').innerHTML = 
            tips.map(tip => `<li>${tip}</li>`).join('');
        
        document.getElementById('feedbackSection').style.display = 'block';
    }

    // Generate tips based on score
    function generateTips(score) {
        const categoryTips = {
            'fresh-grad': [
                'Emphasize your academic projects and internships',
                'Show enthusiasm and willingness to learn',
                'Highlight any leadership roles in university'
            ],
            'experienced': [
                'Provide specific examples with measurable results',
                'Demonstrate progression in your career',
                'Show how you\'ve added value in previous roles'
            ],
            'senior': [
                'Focus on strategic thinking and leadership impact',
                'Discuss team building and mentorship experiences',
                'Highlight your vision and change management skills'
            ],
            'career-change': [
                'Clearly connect your transferable skills',
                'Show genuine passion for the new field',
                'Demonstrate proactive learning and preparation'
            ]
        };
        
        const tips = [];
        
        if (score < 50) {
            tips.push('Try to provide more detailed answers with specific examples');
            tips.push('Use the STAR method to structure your responses');
        } else if (score < 75) {
            tips.push('Add more specific metrics and achievements');
            tips.push('Practice speaking more fluently and confidently');
        } else {
            tips.push('Excellent performance! Keep practicing to maintain consistency');
        }
        
        if (currentCategory && categoryTips[currentCategory]) {
            tips.push(...categoryTips[currentCategory].slice(0, 2));
        }
        
        return tips;
    }

    // Load practice questions
    function loadQuestions() {
        const allQuestions = Object.values(questionsByCategory).flat();
        const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.text, q])).values());
        
        const categoryFilter = document.getElementById('categoryFilter').value;
        const difficultyFilter = document.getElementById('difficultyFilter').value;
        
        let filtered = uniqueQuestions;
        
        if (difficultyFilter !== 'all') {
            filtered = filtered.filter(q => q.difficulty === difficultyFilter);
        }
        
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = filtered.map((q, index) => `
            <div class="question-card">
                <p class="question-text">${q.text}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span class="difficulty-badge difficulty-${q.difficulty}">${q.difficulty}</span>
                    <button class="btn btn-primary" onclick="practiceQuestion(${index})">Practice</button>
                </div>
            </div>
        `).join('');
    }

    // Practice single question - Priority 4
    function practiceQuestion(index) {
        safeExecuteWithFeedback(() => {
            const allQuestions = Object.values(questionsByCategory).flat();
            const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.text, q])).values());
            
            if (index < 0 || index >= uniqueQuestions.length) {
                throw new Error(`Invalid question index: ${index}`);
            }
            
            isSinglePractice = true;
            selectedQuestion = uniqueQuestions[index];
            
            showSection('mock');
            
            currentCategory = null;
            document.querySelectorAll('.category-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            const interviewSetup = document.getElementById('interviewSetup');
            if (interviewSetup) {
                interviewSetup.style.display = 'none';
            }
            
            const currentQuestion = document.getElementById('currentQuestion');
            if (currentQuestion) {
                currentQuestion.textContent = `Practice Mode: ${selectedQuestion.text}`;
            }
            
            startInterview();
        }, () => {
            console.error(`Failed to start practice for question ${index}`);
        }, "Could not start practice session. Please try again.");
    }

    // Progress tracking - Priority 3
    function saveProgress() {
        const sessionTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        progressData.interviews.push({
            date: new Date().toISOString(),
            score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            questions: answers.length,
            category: isSinglePractice ? 'Practice' : currentCategory,
            time: sessionTime
        });
        
        progressData.totalQuestions += answers.length;
        progressData.totalTime += sessionTime;
        
        persistProgress();
    }

    function updateProgress() {
        document.getElementById('totalInterviews').textContent = progressData.interviews.length;
        document.getElementById('questionsAnswered').textContent = progressData.totalQuestions;
        
        const avgScore = progressData.interviews.length > 0 ?
            Math.round(progressData.interviews.reduce((sum, i) => sum + i.score, 0) / progressData.interviews.length) : 0;
        document.getElementById('avgScore').textContent = avgScore + '%';
        
        const hours = Math.floor(progressData.totalTime / 3600);
        const minutes = Math.floor((progressData.totalTime % 3600) / 60);
        document.getElementById('practiceTime').textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        if (progressData.interviews.length > 0) {
            const recent = progressData.interviews.slice(-5).reverse();
            document.getElementById('recentPerformance').innerHTML = recent.map(i => {
                const date = new Date(i.date);
                const timeSpent = i.time ? `${Math.floor(i.time / 60)}:${(i.time % 60).toString().padStart(2, '0')}` : 'N/A';
                
                return `
                    <div class="question-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <p style="font-weight: bold; color: var(--primary);">
                                    ${i.category === 'Practice' ? 'Single Question Practice' : getCategoryName(i.category)}
                                </p>
                                <p style="color: var(--text); font-size: 14px;">
                                    ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 24px; font-weight: bold; color: ${getScoreColor(i.score)};">
                                    ${i.score}%
                                </p>
                            </div>
                        </div>
                        <div style="margin-top: 10px; display: flex; gap: 15px; font-size: 14px;">
                            <span>📝 Questions: ${i.questions}</span>
                            <span>⏱️ Time: ${timeSpent}</span>
                        </div>
                        <div style="margin-top: 10px;">
                            <div class="progress-bar" style="height: 8px;">
                                <div class="progress-fill" style="width: ${i.score}%; background: ${getScoreColor(i.score)};"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            document.getElementById('recentPerformance').innerHTML = `
                <div class="question-card" style="text-align: center; padding: 40px;">
                    <p style="font-size: 48px; margin-bottom: 10px;">🎯</p>
                    <p>Start practicing to see your performance history!</p>
                    <button class="btn btn-primary" onclick="showSection('mock')" style="margin-top: 20px;">
                        Start Your First Interview
                    </button>
                </div>
            `;
        }
    }

    // Helper function to get color based on score
    function getScoreColor(score) {
        if (score >= 80) return 'var(--success)';
        if (score >= 60) return 'var(--warning)';
        return 'var(--error)';
    }

    // Modal functions
    function showModal(type) {
        const modal = document.getElementById('modal');
        const content = document.getElementById('modalContent');
        
        const modalData = {
            star: {
                content: `
                    <h2>STAR Method for Behavioral Questions</h2>
                    <ul>
                        <li><strong>Situation:</strong> Set the context for your story</li>
                        <li><strong>Task:</strong> Describe what your responsibility was</li>
                        <li><strong>Action:</strong> Explain exactly what steps you took</li>
                        <li><strong>Result:</strong> Share what outcomes your actions achieved</li>
                    </ul>
                    <p style="margin-top: 20px;"><strong>Example:</strong></p>
                    <p>"In my previous role (Situation), I was tasked with reducing customer complaints (Task). I implemented a new feedback system and trained the team (Action), resulting in a 40% decrease in complaints within 3 months (Result)."</p>
                `
            },
            body: {
                content: `
                    <h2>Master Your Body Language</h2>
                    <ul>
                        <li>Maintain appropriate eye contact (60-70% of the time)</li>
                        <li>Sit up straight with shoulders back</li>
                        <li>Use hand gestures naturally when speaking</li>
                        <li>Smile genuinely and nod to show engagement</li>
                        <li>Keep your hands visible and avoid crossing arms</li>
                        <li>Lean slightly forward to show interest</li>
                        <li>Mirror the interviewer's energy level</li>
                    </ul>
                    <p style="margin-top: 20px;"><strong>Tip:</strong> Practice in front of a mirror or record yourself to improve your body language.</p>
                `
            },
            salary: {
                content: `
                    <h2>Negotiating Your Worth</h2>
                    <ul>
                        <li>Research market rates for your position and location</li>
                        <li>Consider the total compensation package (benefits, bonuses, equity)</li>
                        <li>Don't be the first to mention a number if possible</li>
                        <li>Provide a salary range rather than a fixed number</li>
                        <li>Be prepared to justify your ask with achievements</li>
                        <li>Know your walk-away point</li>
                        <li>Consider non-monetary benefits (flexible hours, remote work)</li>
                    </ul>
                    <p style="margin-top: 20px;"><strong>Remember:</strong> Negotiation is expected - most employers have flexibility in their initial offer.</p>
                `
            },
            followup: {
                content: `
                    <h2>After the Interview</h2>
                    <ul>
                        <li>Send a thank-you email within 24 hours</li>
                        <li>Personalize each message for different interviewers</li>
                        <li>Reference specific topics discussed</li>
                        <li>Keep it concise (under 200 words)</li>
                        <li>Reiterate your interest in the position</li>
                        <li>Address any concerns that came up</li>
                        <li>Follow the timeline they provided</li>
                    </ul>
                    <p style="margin-top: 20px;"><strong>Template:</strong></p>
                    <p>"Dear [Name], Thank you for taking the time to meet with me today. I enjoyed our discussion about [specific topic]. I'm excited about the opportunity to [specific contribution]. Looking forward to the next steps. Best regards, [Your Name]"</p>
                `
            }
        };
        
        content.innerHTML = modalData[type].content;
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modal').classList.remove('active');
    }

    function showHelp() {
        const modal = document.getElementById('modal');
        const content = document.getElementById('modalContent');
        
        content.innerHTML = `
            <h2>How to Use InterviewAce</h2>
            <p>Welcome to your comprehensive interview preparation platform!</p>
            
            <h3>🎯 Getting Started</h3>
            <ul>
                <li><strong>Select Your Profile:</strong> Choose the category that best matches your experience level (Fresh Graduate, Experienced, Senior, or Career Change)</li>
                <li><strong>Mock Interview:</strong> Experience realistic interviews with an AI HR interviewer who will guide you through questions</li>
                <li><strong>Practice Mode:</strong> Practice individual questions at your own pace</li>
            </ul>
            
            <h3>🎤 Voice Features</h3>
            <ul>
                <li>Click the microphone button to answer using voice recognition</li>
                <li>Speak clearly and at a normal pace</li>
                <li>The system will convert your speech to text automatically</li>
                <li>You can edit the text manually if needed</li>
            </ul>
            
            <h3>💡 Interview Tips</h3>
            <ul>
                <li>Take a moment to think before answering</li>
                <li>Use the STAR method for behavioral questions</li>
                <li>Be specific with examples and achievements</li>
                <li>Keep answers between 1-2 minutes when speaking</li>
            </ul>
            
            <h3>📊 Track Your Progress</h3>
            <p>Monitor your improvement over time in the Progress section. Review your scores, practice time, and performance trends.</p>
            
            <p style="margin-top: 20px;"><strong>Pro Tip:</strong> Practice regularly - even 15 minutes a day can significantly improve your interview skills!</p>
        `;
        
        modal.classList.add('active');
    }

    // Load saved progress from localStorage - Priority 3
    function loadProgress() {
        safeExecute(() => {
            const saved = loadFromStorage('interviewProgress');
            if (saved) {
                progressData = JSON.parse(saved);
            }
        }, () => {
            console.log('Using default progress data');
            progressData = {
                interviews: [],
                totalQuestions: 0,
                totalTime: 0
            };
        });
    }

    // Save progress to localStorage - Priority 3
    function persistProgress() {
        safeExecute(() => {
            saveToStorage('interviewProgress', JSON.stringify(progressData));
        }, () => {
            console.warn('Could not save progress data');
        });
    }

    // Enhanced voice availability check
    function checkVoiceAvailability() {
        if ('speechSynthesis' in window) {
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    console.log(`Found ${voices.length} voices for text-to-speech`);
                }
            };
            
            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }

    // Keyboard shortcuts
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'TEXTAREA') return;
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                const voiceBtn = document.getElementById('voiceBtn');
                if (voiceBtn && !voiceBtn.disabled) {
                    toggleVoice();
                }
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const nextBtn = document.getElementById('nextBtn');
                if (nextBtn && !nextBtn.disabled) {
                    nextQuestion();
                }
            }
            
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal');
                if (modal.classList.contains('active')) {
                    closeModal();
                }
            }
        });
    }

    // Global function declarations for HTML onclick events
    window.selectCategory = selectCategory;
    window.showSection = showSection;
    window.startInterview = startInterview;
    window.nextQuestion = nextQuestion;
    window.endInterview = endInterview;
    window.toggleVoice = toggleVoice;
    window.loadQuestions = loadQuestions;
    window.practiceQuestion = practiceQuestion;
    window.showModal = showModal;
    window.closeModal = closeModal;
    window.showHelp = showHelp;

    // Initialize everything on page load - Priority 4
    safeExecuteWithFeedback(() => {
        // Initialize core features
        initSpeechRecognition();
        initTextToSpeech();
        checkVoiceAvailability();
        initKeyboardShortcuts();
        
        // Load saved progress
        loadProgress();
        
        // Load questions for practice section
        safeExecute(() => loadQuestions());
        
        // Update progress if there's saved data
        if (progressData.interviews.length > 0) {
            safeExecute(() => updateProgress());
        }
        
        // Add event listeners for filters
        const categoryFilter = document.getElementById('categoryFilter');
        const difficultyFilter = document.getElementById('difficultyFilter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => safeExecute(() => loadQuestions()));
        }
        
        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', () => safeExecute(() => loadQuestions()));
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'modal') {
                    safeExecute(() => closeModal());
                }
            });
        }
        
        // Add smooth scroll behavior
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                safeExecute(() => {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        });
        
        // Show welcome message for first-time users
        safeExecute(() => {
            if (!loadFromStorage('welcomeShown')) {
                setTimeout(() => {
                    safeExecute(() => {
                        showHelp();
                        saveToStorage('welcomeShown', 'true');
                    });
                }, 1000);
            }
        });
        
        console.log('InterviewAce initialized successfully!');
    }, () => {
        console.error('Failed to initialize InterviewAce');
        document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ff0000;">Application failed to load. Please refresh the page.</div>';
    }, "Application failed to initialize. Please refresh the page and try again.");
});
