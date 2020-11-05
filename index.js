const Alexa = require('ask-sdk-core');
const parseIsoDuration = require('parse-iso-duration');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Welcome to Sleep tips. I will recommend the best tip for you based on your sleeping condition. Do you want to start over or continue from the last?')
      .reprompt('Do you want to start over or continue on your last test?')
      .getResponse();
  },
};

const ContinueIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'ContinueIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('I cannot find your last test result, Let's start over.')
      .getResponse();
  },
};

const InProgressRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    let prompt = '';

    for (const slotName of Object.keys(handlerInput.requestEnvelope.request.intent.slots)) {
      const currentSlot = currentIntent.slots[slotName];
      if (slotName == 'totalSleepTime' && currentSlot.value && parseInt(currentSlot.value, 10) >= 6) {
        return handlerInput.responseBuilder
          .speak('Your sleeping activities are looking good. Keep on!')
          .getResponse();
      }
      var subName = slotName.substring(0, 14);
      switch (subName) {
        case 'totalSleepTime':
        case 'vocationTotalS':
          if (currentSlot.value) {
            var curValue = parseIsoDuration(currentSlot.value);
            if (!curValue || curValue <= 0 || curValue >= 86400000) {
              prompt = `How many hours do you sleep? Your answers should be between 0 to 24 hours. `;

              return handlerInput.responseBuilder
                .speak(prompt)
                .reprompt(prompt)
                .addElicitSlotDirective(currentSlot.name)
                .getResponse();
            }
          }
          break;

        case 'epworthSleepin':
        case 'fatigueSeverit':
          if (currentSlot.value) {
            var curValue = parseInt(currentSlot.value, 10);
            if (!curValue || curValue < scoreBounds[subName].lower || curValue > scoreBounds[subName].higher) {
              prompt = `Please speak a number between ` + scoreBounds[subName].lower + ` and ` + scoreBounds[subName].higher;
              return handlerInput.responseBuilder
                .speak(prompt)
                .reprompt(prompt)
                .addElicitSlotDirective(currentSlot.name)
                .getResponse();
            }
          }
          break;

        default:
          break;
      }
      if (currentSlot.confirmationStatus !== 'CONFIRMED'
                && currentSlot.resolutions
                && currentSlot.resolutions.resolutionsPerAuthority[0]) {
        if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
          if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
            prompt = 'Which would you like';
            const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

            currentSlot.resolutions.resolutionsPerAuthority[0].values
              .forEach((element, index) => {
                prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
              });

            prompt += '?';

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
          if (requiredSlots.indexOf(currentSlot.name) > -1) {
            prompt = `What ${currentSlot.name} are you looking for`;

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        }
      }
    }

    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  },
};

const CompletedRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState === 'COMPLETED';
  },
  handle(handlerInput) {
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

    const slotValues = getSlotValues(filledSlots);

    const TST = parseInt(`${slotValues.totalSleepTime.resolved}`, 10);
    const VacationTST = parseInt(`${slotValues.vocationTotalSleepTime.resolved}`, 10);

    var tips = [
      { name: `You reported that you spend on average <XX> hours in bed and gained only <YY> hours of sleep each night. This amount of sleeping time might affect alertness and concentration during the day and is below what is recommended for a healthy lifestyle. Why don't you give yourself more time to sleep`, description: '' },
      { name: 'To be properly managed, we recommend that you see your doctor', description: '' }
    ];

    const epworthSleepinessScaleScore = parseInt(`${slotValues.epworthSleepinessScaleOne.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleTwo.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleThree.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleFour.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleFive.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleSix.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleSeven.resolved}`, 10) +
                                        parseInt(`${slotValues.epworthSleepinessScaleEight.resolved}`, 10);

    const fatigueSeverityScaleScore = (parseInt(`${slotValues.fatigueSeverityScaleOne.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleTwo.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleThree.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleFour.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleFive.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleSix.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleSeven.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleEight.resolved}`, 10) +
                                        parseInt(`${slotValues.fatigueSeverityScaleNine.resolved}`, 10)) / 9.0;

    var riskRating;
    if (epworthSleepinessScaleScore > 10 || fatigueSeverityScaleScore > 4) {
      riskRating = 3;
    }
    else if (VacationTST - TST >= 2) {
      riskRating = 2;
    }
    else {
      riskRating = 1;
    }

    const speechOutput = `Your responses indicate that you are not getting enough sleep. This can impact your overall health, mood and safety. ` +
                          mainRecommendations[Math.floor(Math.random() * 2)].name + '. '
                          tips[Math.floor(Math.random() * 2)].name + '. ';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('This is Sleep Advisor. I can give tips on helping you sleep better. You can say, take the test.')
      .reprompt('Do you want to start over or continue on your last test?')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Bye')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

const requiredSlots = [
  'epworthSleepinessScaleOne',
  'epworthSleepinessScaleTwo',
  'epworthSleepinessScaleThree',
  'epworthSleepinessScaleFour',
  'epworthSleepinessScaleFive',
  'epworthSleepinessScaleSix',
  'epworthSleepinessScaleSeven',
  'epworthSleepinessScaleEight',
  'fatigueSeverityScaleOne',
  'fatigueSeverityScaleTwo',
  'fatigueSeverityScaleThree',
  'fatigueSeverityScaleFour',
  'fatigueSeverityScaleFive',
  'fatigueSeverityScaleSix',
  'fatigueSeverityScaleSeven',
  'fatigueSeverityScaleEight',
  'fatigueSeverityScaleNine',
  'vocationTotalSleepTime',
  'totalSleepTime',
];

const scoreBounds = {
  'epworthSleepin': {lower: 0, higher: 3},
  'fatigueSeverit': {lower: 1, higher: 7}
};

const mainRecommendations = [
  { name: `Not getting enough sleep is dangerous and often self-inflicted. It is recommended to sleep around 7hours in average adults.`, description: '' },
  { name: `Not getting enough sleep is dangerous and often self-inflicted. It is recommended to sleep around 7hours in average adults. While waiting for your appointment, would you want to hear some options to help you reduce excessive sleepiness during the day time?`, description: '' }
];

function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            isValidated: true,
          };
          break;
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            isValidated: false,
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        isValidated: false,
      };
    }
  }, this);

  return slotValues;
}

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    ContinueIntent,
    InProgressRecommendationIntent,
    CompletedRecommendationIntent,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
