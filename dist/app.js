"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
// 音频转码worker
var recorderWorker = new Worker('./transformpcm.worker.js');
// 记录处理的缓存音频
var buffer = [];
var AudioContext = window.AudioContext || window.webkitAudioContext;
var notSupportTip = '请试用chrome浏览器且域名为localhost或127.0.0.1测试';
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
recorderWorker.onmessage = function (e) {
  var _buffer;
  (_buffer = buffer).push.apply(_buffer, _toConsumableArray(e.data.buffer));
};
var IatRecorder = /*#__PURE__*/function () {
  function IatRecorder(config) {
    _classCallCheck(this, IatRecorder);
    this.config = config;
    this.state = 'ing';

    //以下信息在控制台-我的应用-实时语音转写 页面获取
    this.appId = 32292713;
    this.apiKey = 'MOarkZsK7ACW2p7IGrPxori1';
  }
  _createClass(IatRecorder, [{
    key: "start",
    value: function start() {
      var _this = this;
      this.stop();
      if (navigator.getUserMedia && AudioContext) {
        this.state = 'ing';
        if (!this.recorder) {
          var context = new AudioContext();
          this.context = context;
          this.recorder = context.createScriptProcessor(0, 1, 1);
          var getMediaSuccess = function getMediaSuccess(stream) {
            var mediaStream = _this.context.createMediaStreamSource(stream);
            _this.mediaStream = mediaStream;
            _this.recorder.onaudioprocess = function (e) {
              _this.sendData(e.inputBuffer.getChannelData(0));
            };
            _this.connectWebsocket();
          };
          var getMediaFail = function getMediaFail(e) {
            _this.recorder = null;
            _this.mediaStream = null;
            _this.context = null;
            console.log('请求麦克风失败');
          };
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            }).then(function (stream) {
              getMediaSuccess(stream);
            })["catch"](function (e) {
              getMediaFail(e);
            });
          } else {
            navigator.getUserMedia({
              audio: true,
              video: false
            }, function (stream) {
              getMediaSuccess(stream);
            }, function (e) {
              getMediaFail(e);
            });
          }
        } else {
          this.connectWebsocket();
        }
      } else {
        var isChrome = navigator.userAgent.toLowerCase().match(/chrome/);
        alert(notSupportTip);
      }
    }
  }, {
    key: "stop",
    value: function stop() {
      this.state = 'end';
      try {
        this.mediaStream.disconnect(this.recorder);
        this.recorder.disconnect();
      } catch (e) {}
    }
  }, {
    key: "sendData",
    value: function sendData(buffer) {
      recorderWorker.postMessage({
        command: 'transform',
        buffer: buffer
      });
    }
    // 生成握手参数
  }, {
    key: "getHandShakeParams",
    value: function getHandShakeParams() {
      var appId = this.appId;
      var secretKey = this.apiKey;
      var ts = Math.floor(new Date().getTime() / 1000); //new Date().getTime()/1000+'';
      var signa = hex_md5(appId + ts); //hex_md5(encodeURIComponent(appId + ts));//EncryptUtil.HmacSHA1Encrypt(EncryptUtil.MD5(appId + ts), secretKey);
      var signatureSha = CryptoJSNew.HmacSHA1(signa, secretKey);
      var signature = CryptoJS.enc.Base64.stringify(signatureSha);
      signature = encodeURIComponent(signature);
      return "?appid=" + appId + "&ts=" + ts + "&signa=" + signature;
    }
  }, {
    key: "connectWebsocket",
    value: function connectWebsocket() {
      var _this2 = this;
      var url = 'wss://vop.baidu.com/realtime_asr?sn=xxx';
      var urlParam = this.getHandShakeParams();

      // url = `${url}${urlParam}`
      if ('WebSocket' in window) {
        this.ws = new WebSocket(url);
      } else if ('MozWebSocket' in window) {
        this.ws = new MozWebSocket(url);
      } else {
        alert(notSupportTip);
        return null;
      }
      this.ws.onopen = function (e) {
        console.log(e, 'onopen');
        var startmeg = {
          "type": "START",
          "data": {
            "appid": _this2.appId,
            "appkey": _this2.apiKey,
            "dev_pid": 15372,
            // 识别模型，比如普通话还是英语，是否要加标点等
            "cuid": "cuid-1",
            // 随便填不影响使用。机器的mac或者其它唯一id，页面上计算UV用。
            "format": "pcm",
            "sample": 16000
          }
        };
        _this2.ws.send(JSON.stringify(startmeg));
        _this2.mediaStream.connect(_this2.recorder);
        _this2.recorder.connect(_this2.context.destination);
        setTimeout(function () {
          _this2.wsOpened(e);
        }, 500);
        _this2.config.onStart && _this2.config.onStart(e);
      };
      this.ws.onmessage = function (e) {
        // this.config.onMessage && this.config.onMessage(e)
        _this2.wsOnMessage(e);
      };
      this.ws.onerror = function (e) {
        _this2.stop();
        console.log("关闭连接ws.onerror");
        _this2.config.onError && _this2.config.onError(e);
      };
      this.ws.onclose = function (e) {
        _this2.stop();
        console.log("关闭连接ws.onclose", e);
        $('.start-button').attr('disabled', false);
        _this2.config.onClose && _this2.config.onClose(e);
      };
    }
  }, {
    key: "wsOpened",
    value: function wsOpened() {
      var _this3 = this;
      if (this.ws.readyState !== 1) {
        return;
      }
      var audioData = buffer.splice(0, 1280);
      this.ws.send(new Int8Array(audioData));
      this.handlerInterval = setInterval(function () {
        // websocket未连接
        if (_this3.ws.readyState !== 1) {
          clearInterval(_this3.handlerInterval);
          return;
        }
        if (buffer.length === 0) {
          if (_this3.state === 'end') {
            _this3.ws.send("{\"type\": \"FINISH\"}");
            console.log("发送结束标识");
            clearInterval(_this3.handlerInterval);
          }
          return false;
        }
        var audioData = buffer.splice(0, 1280);
        if (audioData.length > 0) {
          _this3.ws.send(new Int8Array(audioData));
        }
      }, 40);
    }
  }, {
    key: "wsOnMessage",
    value: function wsOnMessage(e) {
      var jsonData = JSON.parse(e.data);
      if ((jsonData === null || jsonData === void 0 ? void 0 : jsonData.err_no) == 0) {
        // 握手成功
        if (this.config.onMessage && typeof this.config.onMessage == 'function') {
          console.log("握手成功", jsonData);
          this.config.onMessage(e.data);
        }
      } else if (jsonData.action == "error") {
        // 连接发生错误
        console.log("出错了:", jsonData);
      }
    }
  }, {
    key: "ArrayBufferToBase64",
    value: function ArrayBufferToBase64(buffer) {
      var binary = '';
      var bytes = new Uint8Array(buffer);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
  }]);
  return IatRecorder;
}();
var IatTaste = /*#__PURE__*/function () {
  function IatTaste() {
    var _this4 = this;
    _classCallCheck(this, IatTaste);
    var iatRecorder = new IatRecorder({
      onClose: function onClose() {
        _this4.stop();
        _this4.reset();
      },
      onError: function onError(data) {
        _this4.stop();
        _this4.reset();
        alert('WebSocket连接失败');
      },
      onMessage: function onMessage(message) {
        _this4.setResult(JSON.parse(message));
      },
      onStart: function onStart() {
        $('hr').addClass('hr');
        var dialect = $('.dialect-select').find('option:selected').text();
        $('.taste-content').css('display', 'none');
        $('.start-taste').addClass('flex-display-1');
        $('.dialect-select').css('display', 'none');
        $('.start-button').text('结束转写');
        $('.time-box').addClass('flex-display-1');
        $('.dialect').text(dialect).css('display', 'inline-block');
        _this4.counterDown($('.used-time'));
      }
    });
    this.iatRecorder = iatRecorder;
    this.counterDownDOM = $('.used-time');
    this.counterDownTime = 0;
    this.text = {
      start: '开始转写',
      stop: '结束转写'
    };
    this.resultText = '';
  }
  _createClass(IatTaste, [{
    key: "start",
    value: function start() {
      this.iatRecorder.start();
    }
  }, {
    key: "stop",
    value: function stop() {
      $('hr').removeClass('hr');
      this.iatRecorder.stop();
    }
  }, {
    key: "reset",
    value: function reset() {
      this.counterDownTime = 0;
      clearTimeout(this.counterDownTimeout);
      buffer = [];
      $('.time-box').removeClass('flex-display-1').css('display', 'none');
      $('.start-button').text(this.text.start);
      $('.dialect').css('display', 'none');
      $('.dialect-select').css('display', 'inline-block');
      $('.taste-button').css('background', '#0b99ff');
    }
  }, {
    key: "init",
    value: function init() {
      var self = this;
      //开始
      $('#taste_button').click(function () {
        if (navigator.getUserMedia && AudioContext && recorderWorker) {
          self.start();
        } else {
          alert(notSupportTip);
        }
      });
      //结束
      $('.start-button').click(function () {
        if ($(this).text() === self.text.start && !$(this).prop('disabled')) {
          $('#result_output').text('');
          self.resultText = '';
          self.start();
          //console.log("按钮非禁用状态，正常启动" + $(this).prop('disabled'))
        } else {
          //$('.taste-content').css('display', 'none')
          $('.start-button').attr('disabled', true);
          self.stop();
          //reset
          this.counterDownTime = 0;
          clearTimeout(this.counterDownTimeout);
          buffer = [];
          $('.time-box').removeClass('flex-display-1').css('display', 'none');
          $('.start-button').text('转写停止中...');
          $('.dialect').css('display', 'none');
          $('.taste-button').css('background', '#8E8E8E');
          $('.dialect-select').css('display', 'inline-block');

          //console.log("按钮非禁用状态，正常停止" + $(this).prop('disabled'))
        }
      });
    }
  }, {
    key: "setResult",
    value: function setResult(data) {
      var currentText = $('#result_output').html();
      var str = '';
      if (data.type == "FIN_TEXT") {
        str = data.result;
      }
      if (currentText.length == 0) {
        $('#result_output').html(str);
      } else {
        $('#result_output').html(currentText + str);
      }
      var ele = document.getElementById('result_output');
      ele.scrollTop = ele.scrollHeight;
    }
  }, {
    key: "counterDown",
    value: function counterDown() {
      var _this5 = this;
      /*//计时5分钟
      if (this.counterDownTime === 300) {
        this.counterDownDOM.text('05: 00')
        this.stop()
      } else if (this.counterDownTime > 300) {
        this.reset()
        return false
      } else */
      if (this.counterDownTime >= 0 && this.counterDownTime < 10) {
        this.counterDownDOM.text('00: 0' + this.counterDownTime);
      } else if (this.counterDownTime >= 10 && this.counterDownTime < 60) {
        this.counterDownDOM.text('00: ' + this.counterDownTime);
      } else if (this.counterDownTime % 60 >= 0 && this.counterDownTime % 60 < 10) {
        this.counterDownDOM.text('0' + parseInt(this.counterDownTime / 60) + ': 0' + this.counterDownTime % 60);
      } else {
        this.counterDownDOM.text('0' + parseInt(this.counterDownTime / 60) + ': ' + this.counterDownTime % 60);
      }
      this.counterDownTime++;
      this.counterDownTimeout = setTimeout(function () {
        _this5.counterDown();
      }, 1000);
    }
  }]);
  return IatTaste;
}();
var iatTaste = new IatTaste();
iatTaste.init();
