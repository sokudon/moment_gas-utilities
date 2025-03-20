// moment は moment.js と moment-timezone.js によりグローバルに定義済みと仮定
// require('moment-timezone') を削除
//ぐぐったらみつかった　posixtz対応のmoment-timezone.jsかくちょうらいぶららりー
//https://github.com/jdiamond/posixtz/blob/master/index.js
//2025/03/20　posix 対応javascriptを見つけたがばぐってるので修正（）、たぶんもとはUTCサーバーたいむじゃないと動かないハズ（）
//ぐろっくたんの評価　https://grok.com/share/bGVnYWN5_7dee4cb7-10a9-4f1c-bea4-540a91679d5c

// グローバルオブジェクトとして関数を定義（exportsを削除）
const posixtz = {
  formatPosixTZ: formatPosixTZ,
  parsePosixTZ: parsePosixTZ,
  getOffsetForLocalDateWithPosixTZ: getOffsetForLocalDateWithPosixTZ,
  formatLocalDateWithOffset: formatLocalDateWithOffset
};

function formatPosixTZ(tz, year) {
  var jan = moment.tz({ year, month: 0, day: 1 }, tz);
  var jun = moment.tz({ year, month: 5, day: 1 }, tz);
  var janOffset = jan.utcOffset();
  var junOffset = jun.utcOffset();
  var stdOffset = Math.min(janOffset, junOffset);
  var dltOffset = Math.max(janOffset, junOffset);
  var std = stdOffset === janOffset ? jan : jun;
  var dlt = dltOffset === janOffset ? jan : jun;

  var s = formatAbbreviationForPosix(std).concat(formatOffsetForPosix(stdOffset));

  if (stdOffset !== dltOffset) {
    s = s.concat(formatAbbreviationForPosix(dlt));

    if (dltOffset !== stdOffset + 60) {
      s = s.concat(formatOffsetForPosix(dltOffset));
    }

    s = s.concat(',').concat(formatTransitionForPosix(tz, std));
    s = s.concat(',').concat(formatTransitionForPosix(tz, dlt));
  }

  return s;

  function formatAbbreviationForPosix(m) {
    var a = m.format('z');
    return /^[\+\-\d]+$/.test(a) ? '<'.concat(a).concat('>') : a;
  }

  function formatOffsetForPosix(offset) {
    var h = (-offset / 60) | 0;
    var m = Math.abs(offset % 60);
    return h + (m === 0 ? '' : ':'.concat(m < 10 ? '0' : '').concat(m));
  }

  function formatTransitionForPosix(tz, m) {
    var transition = getTransition(tz, m);

    if (!transition) {
      return 'J365/25';
    }

    var n = getWeekNumber(transition);

    if (n === 4) {
      for (var i = 1; i <= 6; i++) {
        var nextTransition = getTransition(tz, m.clone().add(i, 'years'));

        if (!nextTransition) {
          continue;
        }

        n = Math.max(n, getWeekNumber(nextTransition));
      }
    }

    var s = transition.format('[M]M.[n].d').replace('n', n);
    var time = transition
      .format('[/]H:mm:ss')
      .replace(/\:00$/, '')
      .replace(/\:00$/, '');

    if (time !== '/2') {
      s = s.concat(time);
    }

    return s;
  }

  function getTransition(tz, m) {
    var zone = moment.tz.zone(tz);
    var ts = zone.untils[zone._index(m)];

    if (!isFinite(ts)) {
      return null;
    }

    return moment(ts).utcOffset(-zone.utcOffset(ts - 1));
  }

  function getWeekNumber(m) {
    return Math.ceil(m.date() / 7);
  }
}

function parsePosixTZ(tz) {
  const result = {
    stdAbbr: null,
    stdOffset: 0,
    dst: false,
    dstAbbr: null,
    dstOffset: null,
    dstStart: null,
    dstEnd: null
  };

  const parts = tz.split(',');
  const localTZ = parts[0];

// localTZ の部分だけをマッチさせる正規表現
  const regex = /^(?:<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?(?:<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?)?|<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?|[A-Za-z]{3,}[-+]?\d+(?::[0-5]\d)?(?:[A-Za-z]{3,})?|<-?\d+>\d(?:<-?\d+>)?|[A-Za-z]{3,}[-+]?\d+)$/;
  
  const match_tz = regex.exec(localTZ);
  if (!match_tz) {
    return null;
  }


  const LOCAL_TZ_RE = /^(\w+)([+-]?\d+)(\w+([+-]?\d+)?)?/;
  const LOCAL_TZ_AB  = /^(<.*?>)([+-]?\d+(?::\d+)?)(?:(<.*?>)([+-]?\d+(?::\d+)?)?)?/;  //angle brackets
  // Groups:           1    2         3   4
  // 1: stdAbbr
  // 2: stdOffset
  // 3: dstAbbr
  // 4: dstOffset

  var match = LOCAL_TZ_RE.exec(localTZ);
  if (!match) {
    match = LOCAL_TZ_AB.exec(localTZ);
  }

  result.stdAbbr = match[1];
  result.stdOffset = match[2] ? parseOffset(match[2]) : 0;

  if (match[3]) {
    result.dst = true;
    result.dstAbbr = match[3];
    result.dstOffset = match[4] ? parseOffset(match[4]) : result.stdOffset + 60;
    result.dstStart = parseTransition(parts[1]);
    result.dstEnd = parseTransition(parts[2]);
  }

  return result;

  function parseOffset(offset) {
    // hh:mm形式に対応
    const [hours, minutes] = offset.split(':');
    let totalMinutes = Number(hours) * 60;
    if (minutes !== undefined) {
      totalMinutes += Number(minutes) * (hours[0] === '-' ? -1 : 1);
    }
    return totalMinutes * -1; // POSIXでは正のオフセットが西側、負が東側
  }

  function parseTransition(transition) {
    if (transition[0] === 'M') {
      const parts = transition.slice(1).split('/');

      const [month, week, day] = parts[0].split('.');

      const time = {
        hour: 2,
        minute: 0,
        second: 0
      };

      if (parts[1]) {
        const timeParts = parts[1].split(':');

        time.hour = Number(timeParts[0]);
        time.minute = timeParts[1] ? Number(timeParts[1]) : 0;
        time.second = timeParts[2] ? Number(timeParts[2]) : 0;
      }

      return Object.assign(
        {
          month: Number(month),
          week: Number(week),
          day: Number(day)
        },
        time
      );
    }

    return null; // TODO: J形式のサポートが必要なら追加
  }
}

function getOffsetForLocalDateWithPosixTZ(localDate, posixTZ) {
  const dt = moment.utc(localDate);
  const parsedTZ = parsePosixTZ(posixTZ);
   

  if (parsedTZ.dst) {
    const year = dt.year();
    const dstStart = transitionToDate(year, parsedTZ.dstStart,parsedTZ.stdOffset/60);
    const dstEnd = transitionToDate(year, parsedTZ.dstEnd,parsedTZ.dstOffset/60);
   

  　if(dstStart > dstEnd){
    if (dt >= dstStart || dt < dstEnd) {
      return parsedTZ.dstOffset;
    }
    }
    else{
    if (dt >= dstStart && dt < dstEnd) {
      return parsedTZ.dstOffset;
    }
    }
  }

  return parsedTZ.stdOffset;

  function transitionToDate(year, { month, week, day, hour, minute, second },offset) {
    const jsMonth = month - 1;

    const dt = moment.utc({ year, month: jsMonth });

    dt.weekday(day);

    if (dt.month() !== jsMonth) {
      dt.add(1, 'week');
    }

    if (week > 1) {
      dt.add(week - 1, 'weeks');

      if (dt.month() !== jsMonth) {
        dt.subtract(1, 'week');
      }
    }


    dt.set({ hour, minute, second });
    dt.add(-offset,"hours")

    return dt.toDate();
  }
}

function formatLocalDateWithOffset(localDate, posixTZ) {
  const dt = moment.utc(localDate);
  const offset = getOffsetForLocalDateWithPosixTZ(dt, posixTZ);
  const dtWithOffset = dt.clone().utcOffset(offset);

  return dt.format('YYYY-MM-DDTHH:mm:ss') + dtWithOffset.format('Z');
}


function testParsePosixTZ() {
  //"<-03>3<-02>,M3.5.0/02,M10.5.0/03";
  // '<+1030>-10:30<+11>-11,M10.1.0,M4.1.0';
  const tz ='<+1030>-10:30<+11>-11,M10.1.0,M4.1.0';
  const parsed = posixtz.parsePosixTZ(tz);
var tzz=getOffsetForLocalDateWithPosixTZ('2025-04-06T01:00:00+10:30', tz)/60;
var tzd=getOffsetForLocalDateWithPosixTZ('2025-04-06T01:30:00+10:30', tz)/60;
var tza=getOffsetForLocalDateWithPosixTZ('2025-10-05T02:00:00+11:00', tz)/60;
var tzda=getOffsetForLocalDateWithPosixTZ('2025-10-05T02:30:00+11:00', tz)/60;

  return tz; // セルに表示する値を返す
}

function posixtzzz_autralia(){//2025年4月6日（日）3時0分 AEDT

var tz=getOffsetForLocalDateWithPosixTZ('2024-10-06T01:00:00+10:00', 'AEST-10AEDT,M10.1.0,M4.1.0/3')/60;
var tzd=getOffsetForLocalDateWithPosixTZ('2024-10-06T02:00:00+10:00', 'AEST-10AEDT,M10.1.0,M4.1.0/3')/60;
var tza=getOffsetForLocalDateWithPosixTZ('2025-04-06T02:00:00+11:00', 'AEST-10AEDT,M10.1.0,M4.1.0/3')/60;
var tzda=getOffsetForLocalDateWithPosixTZ('2025-04-06T03:00:00+11:00', 'AEST-10AEDT,M10.1.0,M4.1.0/3')/60;

  return tz; // セルに表示する値を返す
}

function posixtzzz_america(){
var tz=getOffsetForLocalDateWithPosixTZ('2025-11-02T01:30:00-07:00', 'PST8PDT,M3.2.0,M11.1.0')/60;
var tzd=getOffsetForLocalDateWithPosixTZ('2025-11-02T02:30:00-07:00', 'PST8PDT,M3.2.0,M11.1.0')/60;
var tza=getOffsetForLocalDateWithPosixTZ('2025-03-09T03:00:00-07:00', 'PST8PDT,M3.2.0,M11.1.0')/60;
var tzda=getOffsetForLocalDateWithPosixTZ('2025-03-09T02:00:00-07:00', 'PST8PDT,M3.2.0,M11.1.0')/60;

  return tz; // セルに表示する値を返す
}



function getLocalTZ(tz) {
  const parts = tz.split(',');
  const localTZ = parts[0];

  // localTZ の部分だけをマッチさせる正規表現
  const regex = /^(?:<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?(?:<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?)?|<[+-]\d{2,4}>-\d{1,2}(?::[0-5]\d)?|[A-Za-z]{3,}[-+]?\d+(?::[0-5]\d)?(?:[A-Za-z]{3,})?|<-?\d+>\d(?:<-?\d+>)?|[A-Za-z]{3,}[-+]?\d+)$/;

  if (regex.test(localTZ)) {
    return localTZ;
  } else {
    return null; // またはエラー処理
  }
}


const testStrings = [
    "PST8PDT,M3.2.0,M11.1.0",
    "MST7MDT,M3.2.0,M11.1.0",
    "CST6CDT,M3.2.0,M11.1.0",
    "EST5EDT,M3.2.0,M11.1.0",
    "AEST-10AEDT,M10.1.0,M4.1.0/3",
    "<+1030>-10:30<+11>-11,M10.1.0,M4.1.0",
    "<+0545>-5:45",
    "CET-1CEST,M3.5.0/02,M10.5.0/03",
    "<-03>3",
    "<-03>3<-02>,M3.5.0/02,M10.5.0/03",
    "JST-9",
    "GMT5"
];

testStrings.forEach(tz => {
    const extracted = getLocalTZ(tz);
    if (extracted) {
      console.log(`Original: ${tz}, Extracted: ${extracted}`);
    } else
    {
      console.log(`Original: ${tz}, Extracted: Error`);
    }
});