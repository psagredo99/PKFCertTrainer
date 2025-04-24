// All JS logic will be moved here from index.html

let questions = [];
let current = 0;
let selected = null;
let ok = 0, err = 0;
let answersStatus = [];
let selectedExam = null;

async function loadQuestionsFromXML(xmlPath = 'bbdd.xml') {
    const response = await fetch(xmlPath);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const questionNodes = xmlDoc.querySelectorAll('question');
    const questions = [];
    questionNodes.forEach((qNode, idx) => {
        const number = qNode.getAttribute('id') || (idx + 1);
        const questionText = qNode.querySelector('text')?.textContent?.trim() || '';
        const answers = [];
        let correct = null;
        qNode.querySelectorAll('option').forEach(opt => {
            const optionId = opt.getAttribute('id');
            const text = opt.textContent.trim();
            answers.push({ option: optionId, text });
            if (opt.hasAttribute('correct')) correct = optionId;
        });
        questions.push({ number, question: questionText, answers, correct });
    });
    return questions;
}

function loadQuestion(idx) {
    if (idx >= questions.length) {
        document.getElementById('questionBox').innerHTML = '<b>No more questions!</b>';
        return;
    }
    const q = questions[idx];
    document.getElementById('question').textContent = `${q.number}. ${q.question}`;
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    q.answers.forEach(a => {
        const label = document.createElement('label');
        label.className = 'answer';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'answer';
        radio.value = a.option;
        radio.onclick = () => {
            selected = a.option;
            document.querySelectorAll('.answer').forEach(el => el.classList.remove('selected'));
            label.classList.add('selected');
        };
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${a.option}. ${a.text}`));
        answersDiv.appendChild(label);
    });
    document.getElementById('result').textContent = '';
    document.getElementById('result').className = 'result';
    document.getElementById('verifyBtn').disabled = false;
    document.getElementById('nextBtn').disabled = true;
    selected = null;
    // Restore previous selection if any
    if (answersStatus[idx] && answersStatus[idx].selected) {
        const prev = answersStatus[idx].selected;
        document.querySelectorAll('input[name="answer"]').forEach(radio => {
            if (radio.value === prev) {
                radio.checked = true;
                radio.parentElement.classList.add('selected');
                selected = prev;
            }
        });
    }
}

document.getElementById('verifyBtn').onclick = function() {
    if (!selected) {
        document.getElementById('result').textContent = 'Please select an answer.';
        document.getElementById('result').className = 'result incorrect';
        return;
    }
    const q = questions[current];
    document.querySelectorAll('.answer').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio.value === q.correct) {
            label.classList.add('correct');
        }
        if (radio.checked && radio.value !== q.correct) {
            label.classList.add('incorrect');
        }
        radio.disabled = true;
    });
    let wasCorrect = selected === q.correct;
    if (wasCorrect) {
        document.getElementById('result').textContent = 'Correct!';
        document.getElementById('result').className = 'result correct';
        ok++;
    } else {
        document.getElementById('result').textContent = 'Incorrect.';
        document.getElementById('result').className = 'result incorrect';
        err++;
    }
    answersStatus[current] = { selected, correct: wasCorrect };
    document.getElementById('ok').textContent = ok;
    document.getElementById('err').textContent = err;
    document.getElementById('verifyBtn').disabled = true;
    document.getElementById('nextBtn').disabled = false;
};

document.getElementById('nextBtn').onclick = function() {
    current++;
    loadQuestion(current);
};

document.getElementById('summaryBtn').onclick = function() {
    // Build summary list
    const listDiv = document.getElementById('summaryList');
    listDiv.innerHTML = '';
    questions.forEach((q, idx) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '0.5em';
        let status = answersStatus[idx];
        let color = '#b0bec5';
        let text = 'Unanswered';
        if (status) {
            if (status.correct) { color = '#c8e6c9'; text = 'Correct'; }
            else { color = '#ffcdd2'; text = 'Incorrect'; }
        }
        div.style.background = color;
        div.style.borderRadius = '5px';
        div.style.padding = '0.5em 1em';
        div.style.cursor = 'pointer';
        div.innerHTML = `<b>${q.number}.</b> ${q.question} <span style='margin-left:auto;font-weight:bold;'>${text}</span>`;
        div.onclick = function() {
            document.getElementById('summaryOverlay').style.display = 'none';
            loadQuestion(idx);
            current = idx;
        };
        listDiv.appendChild(div);
    });
    document.getElementById('summaryOverlay').style.display = 'block';
};
document.getElementById('closeSummaryBtn').onclick = function() {
    document.getElementById('summaryOverlay').style.display = 'none';
};

// Password protection logic
const passwordBtn = document.getElementById('passwordBtn');
const passwordInput = document.getElementById('passwordInput');
const passwordOverlay = document.getElementById('passwordOverlay');
const passwordError = document.getElementById('passwordError');
const examSelectOverlay = document.getElementById('examSelectOverlay');
const examListDiv = document.getElementById('examList');

passwordBtn.onclick = function() {
    var input = passwordInput.value;
    if (input === '123') {
        passwordOverlay.style.display = 'none';
        showExamSelection();
    } else {
        passwordError.style.display = 'block';
    }
};
passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        passwordBtn.click();
    }
});

function showExamSelection() {
    fetch('exams.json')
        .then(res => res.json())
        .then(exams => {
            examListDiv.innerHTML = '';
            exams.forEach(exam => {
                // Card container
                const card = document.createElement('div');
                card.className = 'exam-card';
                card.tabIndex = 0;
                card.onclick = function() {
                    selectedExam = exam;
                    examSelectOverlay.style.display = 'none';
                    startExam(exam.file);
                };
                card.onkeydown = function(e) {
                    if (e.key === 'Enter' || e.key === ' ') card.onclick();
                };
                // Icon (simple emoji for now)
                const icon = document.createElement('span');
                icon.className = 'exam-icon';
                icon.textContent = '📝';
                card.appendChild(icon);
                // Info
                const info = document.createElement('div');
                info.className = 'exam-info';
                const title = document.createElement('div');
                title.className = 'exam-title';
                title.textContent = exam.name;
                info.appendChild(title);
                if (exam.desc) {
                    const desc = document.createElement('div');
                    desc.className = 'exam-desc';
                    desc.textContent = exam.desc;
                    info.appendChild(desc);
                }
                card.appendChild(info);
                examListDiv.appendChild(card);
            });
            examSelectOverlay.style.display = 'flex';
        });
}

function startExam(xmlFile) {
    loadQuestionsFromXML(xmlFile).then(qs => {
        questions = qs;
        current = 0;
        ok = 0;
        err = 0;
        answersStatus = Array(questions.length);
        document.getElementById('ok').textContent = ok;
        document.getElementById('err').textContent = err;
        loadQuestion(current);
    }).catch(err => {
        document.getElementById('questionBox').innerHTML = '<b>Error loading questions.</b>';
        console.error(err);
    });
}

// On page load, hide everything except password overlay
window.onload = function() {
    document.getElementById('questionBox').style.display = 'block';
    document.getElementById('summaryOverlay').style.display = 'none';
    examSelectOverlay.style.display = 'none';
    passwordOverlay.style.display = 'flex';
};