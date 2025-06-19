const _ = require('lodash');
const wrap = require('word-wrap');

const defaultSubjectSeparator = ': ';
const defaultMaxLineWidth = 100;
const defaultBreaklineChar = '|';
const defaultTicketNumberSeparator = ' ';

const addTicketNumber = (ticketNumber, config = {}) => {
  if (!ticketNumber) {
    if(!config.fallbackTicketNumber) {
      return '';
    } else {
      ticketNumber = config.fallbackTicketNumber;
    }
  }

  let trimmedTicketNumber = ticketNumber.trim();

  if (config.ticketNumberPrefix) {
    trimmedTicketNumber = `${config.ticketNumberPrefix}${trimmedTicketNumber}`;
  }

  if (config.ticketNumberSuffix) {
    trimmedTicketNumber = `${trimmedTicketNumber}${config.ticketNumberSuffix}`;
  }

  if (config.ticketNumberSeparator !== undefined) {
    trimmedTicketNumber = `${trimmedTicketNumber}${config.ticketNumberSeparator}`;
  }

  return trimmedTicketNumber;
};

const addScope = (scope, config = {}) => {
  const separator = _.get(config, 'subjectSeparator', defaultSubjectSeparator);

  if (!scope) return separator; // it could be type === WIP. So there is no scope

  return `(${scope.trim()})${separator}`;
};

const addSubject = subject => _.trim(subject);

const addType = (type, config = {}) => {
  const prefix = _.get(config, 'typePrefix', '');
  const suffix = _.get(config, 'typeSuffix', '');

  return _.trim(`${prefix}${type}${suffix}`);
};

const addBreaklinesIfNeeded = (value, breaklineChar = defaultBreaklineChar) => {
  if (!value) return '';
  
  return value
    .split(breaklineChar)
    .join('\n')
    .valueOf();
};

const addFooter = (footer, config = {}) => {
  if (config && config.footerPrefix === '') return `\n\n${footer}`;

  const footerPrefix = config && config.footerPrefix ? config.footerPrefix : 'ISSUES CLOSED:';

  return `\n\n${footerPrefix} ${addBreaklinesIfNeeded(footer, config.breaklineChar)}`;
};

const escapeSpecialChars = (result) => {
  if (!result) return '';
  
  // 需要转义的特殊字符，注意$需要特殊处理
  const specialChars = [
    { char: '`', escaped: '\\`' },
    { char: '"', escaped: '\\"' },
    { char: '$', escaped: '\\$' },
    { char: '!', escaped: '\\!' },
    { char: '<', escaped: '\\<' },
    { char: '>', escaped: '\\>' },
    { char: '&', escaped: '\\&' }
  ];
  let newResult = result;

  specialChars.forEach(({ char, escaped }) => {
    // If user types `feat: "string"`, the commit preview should show `feat: \"string\"`.
    // Don't worry. The git log will be `feat: "string"`
    newResult = newResult.replace(new RegExp(`\\${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), escaped);
  });

  return newResult;
};

module.exports = (answers, config = {}) => {
  const wrapOptions = {
    trim: true,
    newline: '\n',
    indent: '',
    width: defaultMaxLineWidth,
  };

  // Hard limit this line
  // eslint-disable-next-line max-len
  const head =
    addType(answers.type, config) +
    addScope(answers.scope, config) +
    addTicketNumber(answers.ticketNumber, config) +
    addSubject(answers.subject ? answers.subject.slice(0, config.subjectLimit || answers.subject.length) : '');

  // Wrap these lines at 100 characters
  let body;
  if (answers.body) {
    body = answers.body;
    body = addBreaklinesIfNeeded(body, config.breaklineChar);
    body = wrap(body, wrapOptions);
  } else {
    body = '';
  }

  (config.additionalQuestions || []).forEach((question) => {
    if (answers[question.name]) {
      body += `\n${question.mapping} ${answers[question.name]}`;
    }
  });

  const breaking = answers.breaking ? wrap(answers.breaking, wrapOptions) : '';
  const footer = answers.footer ? wrap(answers.footer, wrapOptions) : '';

  let result = head;
  if (body) {
    result += `\n\n${body}`;
  }
  if (breaking) {
    const breakingPrefix = config && config.breakingPrefix ? config.breakingPrefix : 'BREAKING CHANGE:';
    result += `\n\n${breakingPrefix}\n${breaking}`;
  }
  if (footer) {
    result += addFooter(footer, config);
  }

  return escapeSpecialChars(result);
};
