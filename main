// ==UserScript==
// @name         Автоматизация Тестов
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Автоматизирует решение тестов с использованием ответов с другого сайта
// @author       kiraygd
// @match        *://iomqt-vo.edu.rosminzdrav.ru/*
// @match        *://nmfo-vo.edu.rosminzdrav.ru/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements */

(function() {
    'use strict';

    let answersUrl = '';

    // Функция для отображения модального окна с вводом URL
    function showUrlInputModal() {
        const modalHtml = `
            <div id="urlInputModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: #fff; padding: 20px; border-radius: 5px; width: 300px; text-align: center;">
                    <h2>Введите URL с ответами</h2>
                    <input type="text" id="answersUrlInput" style="width: 100%; padding: 8px;" placeholder="https://example.com/answers">
                    <button id="submitUrlButton" style="margin-top: 10px; padding: 10px 20px;">OK</button>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        $('#submitUrlButton').on('click', function() {
            const url = $('#answersUrlInput').val();
            if (url) {
                answersUrl = url;
                $('#urlInputModal').remove();
                main(); // Запускаем основную функцию
            } else {
                alert('Пожалуйста, введите корректный URL');
            }
        });
    }

    function fetchAnswers() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: answersUrl,
                onload: function(response) {
                    if (response.status === 200) {
                        console.log("Ответы успешно загружены");
                        const answers = parseAnswers(response.responseText);
                        console.log("Ответы:", answers);
                        resolve(answers);
                    } else {
                        reject(`Ошибка при загрузке ответов: ${response.statusText}`);
                    }
                },
                onerror: function(error) {
                    reject(`Ошибка запроса: ${error}`);
                }
            });
        });
    }

    function parseAnswers(responseText) {
        const answers = {};
        const doc = new DOMParser().parseFromString(responseText, 'text/html');
        const questions = $(doc).find('h3');
        questions.each(function() {
            const questionText = $(this).text().trim();
            const answerElements = $(this).next('p').find('strong');
            const answerTexts = [];
            answerElements.each(function() {
                const answerText = $(this).text().replace(/^\d+\)\s+/, '').trim();
                const trimmedAnswer = answerText.substring(0, answerText.length - 2); // Убираем два последних символа
                answerTexts.push(trimmedAnswer);
            });
            answers[questionText] = answerTexts;
        });
        return answers;
    }

    function findAnswer(question, answers) {
        const normalizedQuestion = question.toLowerCase();
        for (let key in answers) {
            const normalizedKey = key.toLowerCase();
            if (normalizedKey.includes(normalizedQuestion)) {
                return answers[key];
            }
        }
        return undefined;
    }

   function fillTests(answers) {
       console.log("Заполняем тесты");

       const questionElement = $('.question-title-text').first();
       if (questionElement.length === 0) {
           console.log("Вопрос не найден.");
           return;
       }

       const question = questionElement.text().trim();
       console.log("Вопрос:", question);

       logAvailableAnswers(); // Вывод доступных вариантов ответов

       const answer = findAnswer(question, answers);
       console.log("Ответ:", answer);

       if (!answer) {
           console.log("Ответ не найден.");
           goToNextQuestion();
           return;
       }

       const questionTypeElement = $('.mat-card-question__type').first();
       const questionType = questionTypeElement.text().trim();
       console.log("Тип вопроса:", questionType);

       if (questionType.includes("ОДИН")) {
           $('mat-radio-button').each(function () {
               const radioButton = $(this);
               const radioButtonLabel = radioButton.find('.question-inner-html-text').text();
               const containsAnswer = answer.includes(radioButtonLabel);
               console.log("Сравнение ответа", radioButtonLabel, "с верным ответом:", containsAnswer);
               if (containsAnswer) {
                   console.log("Нажимаем кнопку:", radioButtonLabel);
                   const inputElement = radioButton.find('input')[0];
                   inputElement.setAttribute('checked', 'true');

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
               if (answerIndex >= answer.length) {
                   goToNextQuestion();
                   return;
               }

               $('mat-checkbox').each(function () {
                   const checkBox = $(this);
                   const checkBoxLabel = checkBox.find('.question-inner-html-text').text().trim();
                   if (answer.some(ans => ans.trim() === checkBoxLabel)) {
                       console.log("Нажимаем чекбокс:", checkBoxLabel);
                       const inputElement = checkBox.find('input')[0];

                       if (!inputElement.checked) {
                           inputElement.setAttribute('checked', 'true');

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

    function goToNextQuestion() {
        const nextButton = $('button:contains("Следующий вопрос")');
        const finishButton = $('button:contains("Завершить тестирование")');
        if (nextButton.length > 0) {
            nextButton.click();
        } else if (finishButton.length > 0) {
            console.log("Кнопка для завершения тестирования найдена. Скрипт останавливается.");
            return; // Останавливаем выполнение скрипта
        } else {
            console.log("Кнопка для перехода к следующему вопросу не найдена. Скрипт останавливается.");
            return; // Останавливаем выполнение скрипта
        }
    }



    function logAvailableAnswers() {
        const availableAnswers = [];
        $('.question-inner-html-text').each(function () {
            availableAnswers.push($(this).text().trim());
        });
        console.log("Доступные варианты ответов на текущий вопрос:", availableAnswers);
    }

    async function main() {
        try {
            const answers = await fetchAnswers();

            const observer = new MutationObserver(() => {
                //setTimeout(() => { // Добавляем задержку на поиск ответа
                    fillTests(answers);
                //}, 2000); // Увеличиваем время ожидания до 2 секунд
            });

            observer.observe(document.body, { childList: true, subtree: true });

            fillTests(answers);
        } catch (error) {
            console.error(`Ошибка: ${error}`);
        }
    }

    // Запускаем модальное окно для ввода URL
    showUrlInputModal();
})();
