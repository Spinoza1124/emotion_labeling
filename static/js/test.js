/**
 * 标注能力测试系统前端脚本
 * 主要功能:
 * 1. 加载测试音频和正确答案
 * 2. 处理用户答题逻辑
 * 3. 计算正确率并判断是否通过测试
 * 4. 跳转到正式标注页面或重新测试
 */

document.addEventListener('DOMContentLoaded', function() {
    
    //==============================================
    // 1. DOM元素获取与变量初始化
    //==============================================
    
    const testUsernameSpan = document.getElementById('test-username');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');
    const accuracySpan = document.getElementById('accuracy');
    const progressBar = document.getElementById('progress-bar');
    const testQuestion = document.getElementById('test-question');
    const testAudio = document.getElementById('test-audio');
    const discreteOptions = document.getElementById('discrete-options');
    const vaOptions = document.getElementById('va-options');
    const testVSlider = document.getElementById('test-v-slider');
    const testASlider = document.getElementById('test-a-slider');
    const testVDisplay = document.getElementById('test-v-display');
    const testADisplay = document.getElementById('test-a-display');
    const skipTestBtn = document.getElementById('skip-test-btn');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const finishTestBtn = document.getElementById('finish-test-btn');
    const testResult = document.getElementById('test-result');
    
    // 状态变量
    let currentUsername = '';
    let testQuestions = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let userAnswers = [];
    let selectedAnswer = null;
    let isAnswerSubmitted = false;
    
    //==============================================
    // 2. 初始化和用户验证
    //==============================================
    
    /**
     * 初始化测试页面
     */
    function initTest() {
        // 获取用户名
        currentUsername = localStorage.getItem('emotion_labeling_username');
        if (!currentUsername) {
            alert('请先登录！');
            window.location.href = '/';
            return;
        }
        
        testUsernameSpan.textContent = currentUsername;
        
        // 加载测试题目
        loadTestQuestions();
    }
    
    /**
     * 加载测试题目
     */
    async function loadTestQuestions() {
        try {
            const response = await fetch('/api/test/questions');
            const data = await response.json();
            
            if (data.success) {
                testQuestions = data.questions;
                totalQuestionsSpan.textContent = testQuestions.length;
                
                // 开始第一题
                showQuestion(0);
            } else {
                throw new Error(data.error || '加载测试题目失败');
            }
        } catch (error) {
            console.error('加载测试题目失败:', error);
            alert('加载测试题目失败，请刷新页面重试。');
        }
    }
    
    /**
     * 显示指定题目
     * @param {number} index - 题目索引
     */
    function showQuestion(index) {
        if (index >= testQuestions.length) {
            showTestResult();
            return;
        }
        
        const question = testQuestions[index];
        currentQuestionIndex = index;
        isAnswerSubmitted = false;
        selectedAnswer = null;
        
        // 更新进度
        currentQuestionSpan.textContent = index + 1;
        const progress = ((index + 1) / testQuestions.length) * 100;
        progressBar.style.width = progress + '%';
        
        // 更新正确率
        const accuracy = index > 0 ? Math.round((correctAnswers / index) * 100) : 0;
        accuracySpan.textContent = accuracy + '%';
        
        // 设置音频
        testAudio.src = `/api/test/audio/${question.filename}`;
        
        // 根据测试类型显示不同的选项
        if (question.type === 'discrete') {
            showDiscreteOptions(question);
        } else if (question.type === 'potency') {
            showPotencyOptions(question);
        } else if (question.type === 'arousal') {
            showArousalOptions(question);
        }
        
        // 重置按钮状态
        submitAnswerBtn.disabled = true;
        submitAnswerBtn.style.display = 'inline-block';
        nextQuestionBtn.style.display = 'none';
        finishTestBtn.style.display = 'none';
        
        // 清除之前的选择状态
        clearSelections();
    }
    
    /**
     * 显示离散情感选项
     * @param {Object} question - 题目对象
     */
    function showDiscreteOptions(question) {
        testQuestion.textContent = '请听音频并选择正确的情感类型：';
        discreteOptions.style.display = 'grid';
        vaOptions.style.display = 'none';
        
        // 为选项添加点击事件
        const options = discreteOptions.querySelectorAll('.test-option');
        options.forEach(option => {
            option.onclick = () => selectDiscreteOption(option);
        });
    }
    
    /**
     * 显示效价值选项（只有V滑动条）
     * @param {Object} question - 题目对象
     */
    function showPotencyOptions(question) {
        testQuestion.textContent = '请听音频并调整效价值(V值)到正确的位置：';
        discreteOptions.style.display = 'none';
        vaOptions.style.display = 'block';
        
        // 重置滑动条
        testVSlider.value = 0;
        testASlider.value = 1;
        updateVADisplay();
        
        // 隐藏A滑动条，只显示V滑动条
        testASlider.parentElement.style.display = 'none';
        testVSlider.parentElement.style.display = 'block';
        
        // 添加滑动条事件
        testVSlider.oninput = () => {
            updateVADisplay();
            checkPotencySelection();
        };
    }
    
    /**
     * 显示唤醒值选项（只有A滑动条）
     * @param {Object} question - 题目对象
     */
    function showArousalOptions(question) {
        testQuestion.textContent = '请听音频并调整唤醒值(A值)到正确的位置：';
        discreteOptions.style.display = 'none';
        vaOptions.style.display = 'block';
        
        // 重置滑动条
        testVSlider.value = 0;
        testASlider.value = 1;
        updateVADisplay();
        
        // 隐藏V滑动条，只显示A滑动条
        testVSlider.parentElement.style.display = 'none';
        testASlider.parentElement.style.display = 'block';
        
        // 添加滑动条事件
        testASlider.oninput = () => {
            updateVADisplay();
            checkArousalSelection();
        };
    }
    
    /**
     * 选择离散情感选项
     * @param {Element} option - 选中的选项元素
     */
    function selectDiscreteOption(option) {
        if (isAnswerSubmitted) return;
        
        // 清除其他选项的选中状态
        discreteOptions.querySelectorAll('.test-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // 设置当前选项为选中状态
        option.classList.add('selected');
        selectedAnswer = option.dataset.value;
        
        // 启用提交按钮
        submitAnswerBtn.disabled = false;
    }
    
    /**
     * 检查效价值选择
     */
    function checkPotencySelection() {
        if (isAnswerSubmitted) return;
        
        // 效价值测试中，只要用户移动了V滑动条就可以提交
        selectedAnswer = parseFloat(testVSlider.value);
        
        submitAnswerBtn.disabled = false;
    }
    
    /**
     * 检查唤醒值选择
     */
    function checkArousalSelection() {
        if (isAnswerSubmitted) return;
        
        // 唤醒值测试中，只要用户移动了A滑动条就可以提交
        selectedAnswer = parseFloat(testASlider.value);
        
        submitAnswerBtn.disabled = false;
    }
    
    /**
     * 更新VA值显示
     */
    function updateVADisplay() {
        testVDisplay.textContent = parseInt(testVSlider.value);
        testADisplay.textContent = parseInt(testASlider.value);
    }
    
    /**
     * 清除选择状态
     */
    function clearSelections() {
        // 清除离散情感选项状态
        discreteOptions.querySelectorAll('.test-option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
        });
        
        // 不重置滑动条显示状态，让具体的显示函数来控制
    }
    
    /**
     * 提交答案
     */
    function submitAnswer() {
        if (!selectedAnswer || isAnswerSubmitted) return;
        
        const question = testQuestions[currentQuestionIndex];
        let isCorrect = false;
        
        // 检查答案是否正确
        if (question.type === 'discrete') {
            isCorrect = selectedAnswer === question.correct_answer;
            
            // 显示正确答案
            discreteOptions.querySelectorAll('.test-option').forEach(opt => {
                if (opt.dataset.value === question.correct_answer) {
                    opt.classList.add('correct');
                } else if (opt.dataset.value === selectedAnswer && !isCorrect) {
                    opt.classList.add('incorrect');
                }
            });
        } else if (question.type === 'potency') {
            // 效价值测试：允许一定的误差范围（±0.5）
            const vDiff = Math.abs(selectedAnswer - question.correct_answer);
            isCorrect = vDiff <= 0.5;
            
            // 显示正确答案
            testQuestion.innerHTML = `
                请听音频并调整效价值(V值)到正确的位置：<br>
                <small>您的答案: V=${selectedAnswer}</small><br>
                <small>正确答案: V=${question.correct_answer}</small><br>
                <small style="color: ${isCorrect ? 'green' : 'red'}">${isCorrect ? '正确！' : '错误！'}</small>
            `;
        } else if (question.type === 'arousal') {
            // 唤醒值测试：允许一定的误差范围（±0.5）
            const aDiff = Math.abs(selectedAnswer - question.correct_answer);
            isCorrect = aDiff <= 0.5;
            
            // 显示正确答案
            testQuestion.innerHTML = `
                请听音频并调整唤醒值(A值)到正确的位置：<br>
                <small>您的答案: A=${selectedAnswer}</small><br>
                <small>正确答案: A=${question.correct_answer}</small><br>
                <small style="color: ${isCorrect ? 'green' : 'red'}">${isCorrect ? '正确！' : '错误！'}</small>
            `;
        }
        
        // 记录答案
        userAnswers.push({
            question_index: currentQuestionIndex,
            user_answer: selectedAnswer,
            correct_answer: question.correct_answer,
            is_correct: isCorrect
        });
        
        if (isCorrect) {
            correctAnswers++;
        }
        
        isAnswerSubmitted = true;
        submitAnswerBtn.style.display = 'none';
        
        // 显示下一题或完成按钮
        if (currentQuestionIndex < testQuestions.length - 1) {
            nextQuestionBtn.style.display = 'inline-block';
        } else {
            finishTestBtn.style.display = 'inline-block';
        }
    }
    
    /**
     * 显示测试结果
     */
    function showTestResult() {
        const accuracy = Math.round((correctAnswers / testQuestions.length) * 100);
        const passed = accuracy >= 90;
        
        testResult.style.display = 'block';
        testResult.className = `test-result ${passed ? 'pass' : 'fail'}`;
        
        if (passed) {
            testResult.innerHTML = `
                <h2>🎉 恭喜通过测试！</h2>
                <p>您的正确率为 <strong>${accuracy}%</strong>，已达到90%的要求。</p>
                <p>现在可以进入正式的标注页面了。</p>
                <button class="test-button primary" onclick="goToMainPage()">进入标注页面</button>
            `;
            
            // 保存测试通过状态
            localStorage.setItem('test_passed_' + currentUsername, 'true');
        } else {
            testResult.innerHTML = `
                <h2>❌ 测试未通过</h2>
                <p>您的正确率为 <strong>${accuracy}%</strong>，未达到90%的要求。</p>
                <p>请重新学习标注规则后再次尝试。</p>
                <button class="test-button primary" onclick="retakeTest()">重新测试</button>
                <button class="test-button secondary" onclick="goToMainPage()">跳过测试</button>
            `;
        }
        
        // 隐藏其他按钮
        document.querySelector('.test-controls').style.display = 'none';
    }
    
    /**
     * 跳过测试
     */
    function skipTest() {
        if (confirm('确定要跳过测试吗？跳过测试将直接进入标注页面。')) {
            localStorage.setItem('test_passed_' + currentUsername, 'true');
            goToMainPage();
        }
    }
    
    /**
     * 重新测试
     */
    function retakeTest() {
        // 重置所有状态
        currentQuestionIndex = 0;
        correctAnswers = 0;
        userAnswers = [];
        selectedAnswer = null;
        isAnswerSubmitted = false;
        
        // 隐藏结果，显示控制按钮
        testResult.style.display = 'none';
        document.querySelector('.test-controls').style.display = 'block';
        
        // 重新加载题目
        loadTestQuestions();
    }
    
    /**
     * 进入主页面
     */
    function goToMainPage() {
        window.location.href = '/?keep_login=true';
    }
    
    //==============================================
    // 3. 事件监听器
    //==============================================
    
    skipTestBtn.addEventListener('click', skipTest);
    submitAnswerBtn.addEventListener('click', submitAnswer);
    nextQuestionBtn.addEventListener('click', () => showQuestion(currentQuestionIndex + 1));
    finishTestBtn.addEventListener('click', showTestResult);
    
    // 全局函数（供HTML调用）
    window.goToMainPage = goToMainPage;
    window.retakeTest = retakeTest;
    
    //==============================================
    // 4. 初始化
    //==============================================
    
    initTest();
});