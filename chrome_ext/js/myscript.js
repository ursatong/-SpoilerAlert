var ClassToDisplay = '.stream-item-header, .bottom-tweet-actions';
var storage = chrome.storage.local;
// storage.clear();
var SpoilerKey = 'spoiler_data';
var SelfUserId;
var $spoiler_tweets;
var getUserIdFromStreamItem = function ($stream_item) {
  return $stream_item.find('.tweet').data('user-id');
};

var getTimeFromStreamItem = function ($stream_item) {
  return parseInt(
    $stream_item.find('.content')
      .find('.js-short-timestamp')
      .data('time')
  );
};

console.log("JS IN EXTENSION");
function init() {
  SelfUserId = JSON.parse($('#init-data').val()).userId;
  $spoiler_tweets = $('.stream .stream-item .js-stream-tweet .twitter-hashtag').filter(function() {
    return this.innerText.toUpperCase() == "#SPOILERALERT";
  }).closest('.stream-item');
  $spoiler_tweets.each(function() {
    var $tweet = $(this);
    var user_id = getUserIdFromStreamItem($tweet);
    var time = getTimeFromStreamItem($tweet);
    var $content = $tweet.find('.content');
    checkAndHide($content, user_id, time);
  });
}

function checkAndHide($content, user_id, time) {
  storage.get(SpoilerKey, function(obj) {
    var shoudHide = !((SpoilerKey in obj) &&
      (SelfUserId in obj[SpoilerKey]) &&
      (user_id in obj[SpoilerKey][SelfUserId]) &&
      (parseInt(obj[SpoilerKey][SelfUserId][user_id]) >= time));
    console.log(time);
    console.log(shoudHide);
    if (shoudHide)
      hideTweet($content, user_id, time);
  });
}

function checkStorage(user_id, time) {
  storage.get(SpoilerKey, function(obj) {
    console.log(obj);
    if (!(SpoilerKey in obj))
      obj[SpoilerKey] = {};
    var data = obj[SpoilerKey];
    if (!(SelfUserId in data))
      data[SelfUserId] = {}
    data = data[SelfUserId];
    if (!(user_id in data) || parseInt(data[user_id]) < time) {
      data[user_id] = time;
    }
    time = parseInt(data[user_id]);
    console.log(obj);
    storage.set(obj);
    refreshSpoilerTweetsAfter(user_id, time);
  });
  return time;
}


function refreshSpoilerTweetsAfter(user_id, time) {
  $spoiler_tweets.filter(function () {
    return getUserIdFromStreamItem($(this)) == user_id && getTimeFromStreamItem($(this)) <= time;
  }).each(function () {
    showTweet($(this).find('.content'));
  });
}

function showTweet($content) {
  $content.children().each(function () {
  var $content_div = $(this);
  $content_div.show();
  });
  $content.find('.tweet-not-displayed').hide();
}

function hideTweet($content, user_id, time) {
  $content.children().each(function() {
    var $content_div = $(this);
    if (!$content_div.is(ClassToDisplay)) {
      $content_div.hide();
    }
  });
  if ($content.find('.tweet-not-displayed').length) {
    $content.find('.tweet-not-displayed').show();
    return;
  }
  var spoiler_alert = true;
  var hidden_view = {
    spoiler_alert: spoiler_alert
  };
  var template_url = chrome.extension.getURL("/template/spoiler_alert.mustache");
  $.get(template_url, function (data) {
    var output = Mustache.render(data, hidden_view);
    $content.append(output);
    var $view_tweets_btn = $content.find('.btn.display-this-tweet');
    $view_tweets_btn.click(function () {
      checkStorage(user_id, time);
    });
    var $always_display_btn = $content.find('.btn-link.always-display-tweet');
    $always_display_btn.click(function () {
      checkStorage(user_id, new Date(2200,0,1).getTime());
    });
  });
}

var timeout = null;
document.addEventListener("DOMSubtreeModified", function() {
    if(timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(init, 500);
}, false);

init();