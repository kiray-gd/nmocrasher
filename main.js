// ==UserScript==
// @name         Решатель НМО
// @namespace    http://tampermonkey.net/
// @version      2.31
// @description  Использует текст с одной страницы для поиска на другой странице, извлекает ответы, возвращается на исходный сайт и автоматически заполняет тест
// @author       kiraygd
// @match        *.edu.rosminzdrav.ru/*
// @match        https://24forcare.com/search/*
// @match        https://24forcare.com/testyi-nmo/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Функция для извлечения текста
    function extractText() {
        const cardTitle = document.querySelector('mat-panel-title');
        if (cardTitle) {
            let text = cardTitle.textContent.trim();
            console.log(`Extracted text: ${text}`);

            // Убираем подстроку " - Итоговое тестирование"
            text = text.replace(" - Итоговое тестирование", "");
            console.log(`Text after removing suffix: ${text}`);

            // Находим последний символ ")" и обрезаем строку на этом символе
            const lastParenthesisIndex = text.lastIndexOf(')');
            if (lastParenthesisIndex !== -1) {
                text = text.slice(0, lastParenthesisIndex).trim();
                console.log(`Text after removing content after last ')': ${text}`);
            }

            return text;
        }
        console.error('Card title element not found');
        return null;
    }

    // Функция для выполнения поиска на 24forcare.com
    function searchOn24forcare(query) {
        const url = `https://24forcare.com/search/?query=${encodeURIComponent(query)}`;
        console.log('Navigating to:', url);
        setTimeout(() => {
            window.location.href = url;
        }, 100);
    }

    // Функция для извлечения вопросов и ответов
    function extractAnswers() {
        setTimeout(() => {
            console.log('Starting to extract answers...');
            const questions = document.querySelectorAll('h3');
            const answersArray = [];

            if (questions.length === 0) {
                console.log('No questions found on the page');
            }

            questions.forEach(questionElement => {
                let questionText = questionElement.textContent.trim();
                console.log(`Found question text: ${questionText}`);

                // Удаляем все цифры и точку в начале строки
                questionText = questionText.replace(/^\d+\.\s*/, '');
                console.log(`Processed question text: ${questionText}`);

                const answerElement = questionElement.nextElementSibling;
                if (answerElement) {
                    const correctAnswers = Array.from(answerElement.querySelectorAll('strong'))
                                               .filter(el => el.textContent.includes('+'))
                                               .map(el => {
                                                   // Обрезаем последние символы
                                                   let answerText = el.textContent.replace('+', '').trim();
                                                   answerText = answerText.slice(3, -1);
                                                   return answerText;
                                               });
                    answersArray.push({
                        question: questionText,
                        answers: correctAnswers
                    });
                } else {
                    console.log(`Answer element not found for question: ${questionText}`);
                }
            });

            if (answersArray.length === 0) {
                console.log('No answers extracted');
            } else {
                console.log('Extracted answers:', answersArray);

                // Сохраняем массив вопросов и ответов
                GM_setValue('answersArray', JSON.stringify(answersArray));

                // Показываем сообщение о завершении извлечения ответов
                showCompletionMessage();

                // Возвращаемся на исходный сайт через 3 секунды
                const originalUrl = GM_getValue('originalUrl');
                if (originalUrl) {
                    console.log('Returning to the original site...');
                    setTimeout(() => {
                        window.location.href = originalUrl;
                    }, 3000); // Задержка перед возвратом на исходный URL
                } else {
                    console.error('Original URL is not available');
                }
            }
        }, 2000); // 2 секунды задержки для извлечения ответов
    }

    // Функция для отображения сообщения о завершении извлечения ответов
    function showCompletionMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = 'Ответы загружены. Ждите.';
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.padding = '20px';
        messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        messageDiv.style.color = 'white';
        messageDiv.style.fontSize = '24px';
        messageDiv.style.zIndex = '10000';
        messageDiv.style.textAlign = 'center';
        document.body.appendChild(messageDiv);
    }

    // Добавляем кнопку для запуска поиска на edu.rosminzdrav.ru и его поддоменах
    if (window.location.hostname.endsWith('edu.rosminzdrav.ru')) {
        // Сохраняем текущий URL в GM_setValue
        GM_setValue('originalUrl', window.location.href);
        console.log(`Original URL saved: ${window.location.href}`);

        const searchButton = document.createElement('button');
        searchButton.textContent = 'Включить автотест';
        searchButton.style.position = 'fixed';
        searchButton.style.top = '10px';
        searchButton.style.right = '10px';
        searchButton.style.zIndex = '1000';
        searchButton.style.padding = '10px';
        searchButton.style.backgroundColor = '#4CAF50';
        searchButton.style.color = 'white';
        searchButton.style.border = 'none';
        searchButton.style.borderRadius = '5px';
        searchButton.style.cursor = 'pointer';

        searchButton.addEventListener('click', function() {
            const query = extractText();
            if (query) {
                searchOn24forcare(query);
            } else {
                console.error('Не удалось найти элемент с текстом!');
            }
        });

        document.body.appendChild(searchButton);
    }

    // Запуск извлечения ответов на 24forcare.com
    if (window.location.hostname === '24forcare.com' && window.location.pathname.startsWith('/testyi-nmo/')) {
        window.addEventListener('load', function() {
            console.log('Page loaded, extracting answers...');
            extractAnswers();
        });
    }

    // Автоматическое заполнение теста на исходной странице
    if (window.location.hostname.endsWith('edu.rosminzdrav.ru')) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const savedAnswersArray = GM_getValue('answersArray');
                if (savedAnswersArray) {
                    const answersArray = JSON.parse(savedAnswersArray);
                    console.log('Retrieved answers array:', answersArray);

                    function changeLetters(str) {
                        const replacements = {
                            'a': 'а',
                            'e': 'е',
                            'o': 'о',
                            'c': 'с',
                            'x': 'х'
                        };
                    
                        for (const [latin, cyrillic] of Object.entries(replacements)) {
                            // Заменяем латинскую букву на кириллическую, если:
                            // 1. Она окружена кириллическими буквами
                            // 2. Или если она стоит одна, окруженная пробелами или знаками препинания
                            const regex = new RegExp(
                                `(?<=[\\u0400-\\u04FF])${latin}|${latin}(?=[\\u0400-\\u04FF])|\\b${latin}\\b`,
                                'gi'
                            );
                            str = str.replace(regex, cyrillic);
                        }
                    
                        return str;
                    }

                    function findAnswer(question) {
                        const normalizedQuestion = changeLetters(question).toLowerCase();
                        for (let item of answersArray) {
                            const normalizedKey = item.question.toLowerCase();
                            if (normalizedKey.includes(normalizedQuestion)) {
                                return item.answers;
                            }
                        }
                        return undefined;
                    }

                    function fillTests() {
                        console.log("Заполняем тесты");

                        const questionElement = document.querySelector('.question-title-text');
                        if (!questionElement) {
                            console.log("Вопрос не найден.");
                            return;
                        }

                        const question = questionElement.textContent.trim();
                        console.log("Текущий вопрос:", question); // Выводим текущий вопрос в консоль

                        logAvailableAnswers(); // Вывод доступных вариантов ответов

                        const answers = findAnswer(question);
                        console.log("Ответы:", answers);

                        if (!answers) {
                            console.log("Ответы не найдены.");
                            goToNextQuestion();
                            return;
                        }

                        const questionTypeElement = document.querySelector('.mat-card-question__type');
                        const questionType = questionTypeElement ? questionTypeElement.textContent.trim() : '';
                        console.log("Тип вопроса:", questionType);

                        if (questionType.includes("ОДИН")) {
                            document.querySelectorAll('mat-radio-button').forEach(radioButton => {
                                const radioButtonLabel = changeLetters(radioButton.querySelector('.question-inner-html-text').textContent.trim());
                                const containsAnswer = answers.includes(radioButtonLabel);
                                console.log("Сравнение ответа", radioButtonLabel, "с верным ответом:", containsAnswer);
                                if (containsAnswer) {
                                    console.log("Нажимаем кнопку:", radioButtonLabel);
                                    const inputElement = radioButton.querySelector('input');
                                    inputElement.checked = true;

                                    // Вызов событий через нативный JavaScript
                                    ['click', 'input', 'change'].forEach(eventType => {
                                        const event = new Event(eventType, { bubbles: true });
                                        inputElement.dispatchEvent(event);
                                    });
                                    return false; // Прекращаем итерацию
                                }
                            });
                            goToNextQuestion();
                        } else if (questionType.includes("НЕСКОЛЬКО")) {
                            console.log("LETS GO несколько");

                            let answerIndex = 0;
                            function clickCheckboxes() {
                                if (answerIndex >= answers.length) {
                                    goToNextQuestion();
                                    return;
                                }

                                document.querySelectorAll('mat-checkbox').forEach(checkBox => {
                                    const checkBoxLabel = changeLetters(checkBox.querySelector('.question-inner-html-text').textContent.trim());
                                    if (answers.some(ans => ans.trim() === checkBoxLabel)) {
                                        console.log("Нажимаем чекбокс:", checkBoxLabel);
                                        const inputElement = checkBox.querySelector('input');

                                        if (!inputElement.checked) {
                                            inputElement.checked = true;

                                            // Вызов событий через нативный JavaScript
                                            ['click', 'input', 'change'].forEach(eventType => {
                                                const event = new Event(eventType, { bubbles: true });
                                                inputElement.dispatchEvent(event);
                                            });
                                        }
                                    }
                                });

                                answerIndex++;
                                setTimeout(clickCheckboxes, 500); // Задержка между кликами
                            }

                            clickCheckboxes();
                        } else {
                            console.log("Неизвестный тип вопроса:", questionType);
                            goToNextQuestion();
                        }
                    }

                    function logAvailableAnswers() {
                        console.log("Доступные варианты ответов:");
                        document.querySelectorAll('.question-inner-html-text').forEach(el => {
                            console.log(el.textContent.trim());
                        });
                    }

                    function goToNextQuestion() {
                        console.log("Переход к следующему вопросу");
                        const nextButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes("Следующий вопрос"));
                        const finishButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes("Завершить"));
                        if (nextButton) {
                            nextButton.click();
                            setTimeout(fillTests, 500); // Задержка для загрузки следующего вопроса
                        } else if (finishButton) {
                            console.log("Кнопка для завершения тестирования найдена. Скрипт останавливается.");
                            alert("Тест пройден. Вы великолепны! (author kiraygd)");
                            return; // Останавливаем выполнение скрипта
                        } else {
                            console.log("Кнопка для перехода к следующему вопросу не найдена. Скрипт останавливается.");
                            return; // Останавливаем выполнение скрипта
                        }
                    }

                    fillTests();
                } else {
                    console.log('Answers array is not available');
                }
            }, 3000); // Задержка перед поиском вопроса
        });
    }
})();
