(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', './constants', './utils', './serializers/JsonSerializer'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('./constants'), require('./utils'), require('./serializers/JsonSerializer'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.constants, global.utils, global.JsonSerializer);
        global.wampy = mod.exports;
    }
})(this, function (exports, _constants, _utils, _JsonSerializer) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.Wampy = undefined;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var Wampy = function () {

        /**
         * Wampy constructor
         * @param {string} url
         * @param {Object} options
         */

        function Wampy(url, options) {
            _classCallCheck(this, Wampy);

            /**
             * Wampy version
             * @type {string}
             * @private
             */
            this.version = 'v4.1.0';

            /**
             * WS Url
             * @type {string}
             * @private
             */
            this._url = typeof url === 'string' ? url : null;

            /**
             * WS protocols
             * @type {Array}
             * @private
             */
            this._protocols = ['wamp.2.json'];

            /**
             * WAMP features, supported by Wampy
             * @type {object}
             * @private
             */
            this._wamp_features = {
                agent: 'Wampy.js ' + this.version,
                roles: {
                    publisher: {
                        features: {
                            subscriber_blackwhite_listing: true,
                            publisher_exclusion: true,
                            publisher_identification: true
                        }
                    },
                    subscriber: {},
                    caller: {
                        features: {
                            caller_identification: true,
                            progressive_call_results: true,
                            call_canceling: true,
                            call_timeout: true
                        }
                    },
                    callee: {
                        features: {
                            caller_identification: true
                        }
                    }
                }
            };

            /**
             * Internal cache for object lifetime
             * @type {Object}
             * @private
             */
            this._cache = {
                /**
                 * WAMP Session ID
                 * @type {string}
                 */
                sessionId: null,

                /**
                 * Server WAMP roles and features
                 */
                server_wamp_features: { roles: {} },

                /**
                 * Are we in state of saying goodbye
                 * @type {boolean}
                 */
                isSayingGoodbye: false,

                /**
                 * Status of last operation
                 */
                opStatus: { code: 0, description: 'Success!', reqId: 0 },

                /**
                 * Timer for reconnection
                 * @type {null}
                 */
                timer: null,

                /**
                 * Reconnection attempts
                 * @type {number}
                 */
                reconnectingAttempts: 0
            };

            /**
             * WebSocket object
             * @type {Object}
             * @private
             */
            this._ws = null;

            /**
             * Internal queue for websocket requests, for case of disconnect
             * @type {Array}
             * @private
             */
            this._wsQueue = [];

            /**
             * Internal queue for wamp requests
             * @type {object}
             * @private
             */
            this._requests = {};

            /**
             * Stored RPC
             * @type {object}
             * @private
             */
            this._calls = {};

            /**
             * Stored Pub/Sub
             * @type {object}
             * @private
             */
            this._subscriptions = {};

            /**
             * Stored Pub/Sub topics
             * @type {Array}
             * @private
             */
            this._subsTopics = new Set();

            /**
             * Stored RPC Registrations
             * @type {object}
             * @private
             */
            this._rpcRegs = {};

            /**
             * Stored RPC names
             * @type {Array}
             * @private
             */
            this._rpcNames = new Set();

            /**
             * Options hash-table
             * @type {Object}
             * @private
             */
            this._options = {
                /**
                 * Logging
                 * @type {boolean}
                 */
                debug: false,

                /**
                 * Reconnecting flag
                 * @type {boolean}
                 */
                autoReconnect: true,

                /**
                 * Reconnecting interval (in ms)
                 * @type {number}
                 */
                reconnectInterval: 2 * 1000,

                /**
                 * Maximum reconnection retries
                 * @type {number}
                 */
                maxRetries: 25,

                /**
                 * WAMP Realm to join
                 * @type {string}
                 */
                realm: null,

                /**
                 * Custom attributes to send to router on hello
                 * @type {object}
                 */
                helloCustomDetails: null,

                /**
                 * Authentication id to use in challenge
                 * @type {string}
                 */
                authid: null,

                /**
                 * Supported authentication methods
                 * @type {array}
                 */
                authmethods: [],

                /**
                 * onChallenge callback
                 * @type {function}
                 */
                onChallenge: null,

                /**
                 * onConnect callback
                 * @type {function}
                 */
                onConnect: null,

                /**
                 * onClose callback
                 * @type {function}
                 */
                onClose: null,

                /**
                 * onError callback
                 * @type {function}
                 */
                onError: null,

                /**
                 * onReconnect callback
                 * @type {function}
                 */
                onReconnect: null,

                /**
                 * onReconnectSuccess callback
                 * @type {function}
                 */
                onReconnectSuccess: null,

                /**
                 * User provided WebSocket class
                 * @type {function}
                 */
                ws: null,

                /**
                 * User provided msgpack class
                 * @type {object}
                 */
                serializer: new _JsonSerializer.JsonSerializer()
            };

            if (this._isPlainObject(options)) {
                this._options = this._merge(this._options, options);
            } else if (this._isPlainObject(url)) {
                this._options = this._merge(this._options, url);
            }

            this.connect();
        }

        /* Internal utils methods */
        /**
         * Internal logger
         * @private
         */


        _createClass(Wampy, [{
            key: '_log',
            value: function _log() {
                if (this._options.debug) {
                    console.log(arguments);
                }
            }
        }, {
            key: '_getReqId',
            value: function _getReqId() {
                var reqId = void 0;
                var max = 2 ^ 53;

                do {
                    reqId = Math.floor(Math.random() * max);
                } while (reqId in this._requests);

                return reqId;
            }
        }, {
            key: '_merge',
            value: function _merge() {
                var obj = {},
                    l = arguments.length;
                var i = void 0,
                    attr = void 0;

                for (i = 0; i < l; i++) {
                    for (attr in arguments[i]) {
                        obj[attr] = arguments[i][attr];
                    }
                }

                return obj;
            }
        }, {
            key: '_isArray',
            value: function _isArray(obj) {
                return !!obj && Array.isArray(obj);
            }
        }, {
            key: '_isPlainObject',
            value: function _isPlainObject(obj) {
                return !!obj && obj.constructor === Object;
            }
        }, {
            key: '_setWsProtocols',
            value: function _setWsProtocols() {
                if (!(this._options.serializer instanceof _JsonSerializer.JsonSerializer)) {
                    this._protocols.unshift('wamp.2.' + this._options.serializer.protocol);
                }
            }
        }, {
            key: '_preReqChecks',
            value: function _preReqChecks(topicURI, role, callbacks) {
                var flag = true;

                if (this._cache.sessionId && !this._cache.server_wamp_features.roles[role]) {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG['NO_' + role.toUpperCase()];
                    flag = false;
                }

                if (topicURI && !this._validateURI(topicURI)) {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.URI_ERROR;
                    flag = false;
                }

                if (flag) {
                    return true;
                }

                if (this._isPlainObject(callbacks) && callbacks.onError) {
                    callbacks.onError(this._cache.opStatus.description);
                }

                return false;
            }
        }, {
            key: '_validateURI',
            value: function _validateURI(uri) {
                var re = /^([0-9a-zA-Z_]{2,}\.)*([0-9a-zA-Z_]{2,})$/;
                return !(!re.test(uri) || uri.indexOf('wamp') === 0);
            }
        }, {
            key: '_encode',
            value: function _encode(msg) {
                try {
                    return this._options.serializer.encode(msg);
                } catch (e) {
                    throw new Error('[wampy] encoding exception!');
                }
            }
        }, {
            key: '_decode',
            value: function _decode(msg) {
                try {
                    return this._options.serializer.decode(msg);
                } catch (e) {
                    throw new Error('[wampy] decoding exception!');
                }
            }
        }, {
            key: '_send',
            value: function _send(msg) {
                if (msg) {
                    this._wsQueue.push(this._encode(msg));
                }

                if (this._ws && this._ws.readyState === 1 && this._cache.sessionId) {
                    while (this._wsQueue.length) {
                        this._ws.send(this._wsQueue.shift());
                    }
                }
            }
        }, {
            key: '_resetState',
            value: function _resetState() {
                this._wsQueue = [];
                this._subscriptions = {};
                this._subsTopics = new Set();
                this._requests = {};
                this._calls = {};
                this._rpcRegs = {};
                this._rpcNames = new Set();

                // Just keep attrs that are have to be present
                this._cache = {
                    reconnectingAttempts: 0
                };
            }
        }, {
            key: '_initWsCallbacks',
            value: function _initWsCallbacks() {
                var _this = this;

                if (this._ws) {
                    this._ws.onopen = function () {
                        _this._wsOnOpen();
                    };
                    this._ws.onclose = function (event) {
                        _this._wsOnClose(event);
                    };
                    this._ws.onmessage = function (event) {
                        _this._wsOnMessage(event);
                    };
                    this._ws.onerror = function (error) {
                        _this._wsOnError(error);
                    };
                }
            }
        }, {
            key: '_wsOnOpen',
            value: function _wsOnOpen() {
                var options = this._merge(this._options.helloCustomDetails, this._wamp_features);

                if (this._options.authid) {
                    options.authmethods = this._options._authmethods;
                    options.authid = this._options.authid;
                }

                this._log('[wampy] websocket connected');

                var type = this._options.serializer.binaryType;

                if (!(0, _utils.isBinaryTypeAllowed)(type)) {
                    throw new Error('Binary type is not allowed: ' + type);
                }

                this._ws.binatyType = type;

                // WAMP SPEC: [HELLO, Realm|uri, Details|dict]
                // Sending directly 'cause it's a hello msg and no sessionId check is needed
                this._ws.send(this._encode([_constants.WAMP_MSG_SPEC.HELLO, this._options.realm, options]));
            }
        }, {
            key: '_wsOnClose',
            value: function _wsOnClose(event) {
                var _this2 = this;

                var root = _constants.isNode ? global : window;
                this._log('[wampy] websocket disconnected. Info: ', event);

                // Automatic reconnection
                if ((this._cache.sessionId || this._cache.reconnectingAttempts) && this._options.autoReconnect && this._cache.reconnectingAttempts < this._options.maxRetries && !this._cache.isSayingGoodbye) {
                    this._cache.sessionId = null;
                    this._cache.timer = root.setTimeout(function () {
                        _this2._wsReconnect();
                    }, this._options.reconnectInterval);
                } else {
                    // No reconnection needed or reached max retries count
                    if (this._options.onClose) {
                        this._options.onClose();
                    }

                    this._resetState();
                    this._ws = null;
                }
            }
        }, {
            key: '_wsOnMessage',
            value: function _wsOnMessage(event) {
                var _this3 = this;

                var data = void 0,
                    id = void 0,
                    i = void 0,
                    msg = void 0,
                    p = void 0;

                this._log('[wampy] websocket message received', event.data);

                data = this._decode(event.data);

                switch (data[0]) {
                    case _constants.WAMP_MSG_SPEC.WELCOME:
                        // WAMP SPEC: [WELCOME, Session|id, Details|dict]

                        this._cache.sessionId = data[1];
                        this._cache.server_wamp_features = data[2];

                        if (this._cache.reconnectingAttempts) {
                            // There was reconnection

                            this._cache.reconnectingAttempts = 0;

                            if (this._options.onReconnectSuccess) {
                                this._options.onReconnectSuccess();
                            }

                            // Let's renew all previous state
                            this._renewSubscriptions();
                            this._renewRegistrations();
                        } else {
                            // Firing onConnect event on real connection to WAMP server
                            if (this._options.onConnect) {
                                this._options.onConnect();
                            }
                        }

                        // Send local queue if there is something out there
                        this._send();

                        break;
                    case _constants.WAMP_MSG_SPEC.ABORT:
                        // WAMP SPEC: [ABORT, Details|dict, Reason|uri]
                        if (this._options.onError) {
                            this._options.onError(data[1].message ? data[1].message : data[2]);
                        }
                        this._ws.close();
                        break;
                    case _constants.WAMP_MSG_SPEC.CHALLENGE:
                        // WAMP SPEC: [CHALLENGE, AuthMethod|string, Extra|dict]

                        if (this._options.authid && typeof this._options.onChallenge === 'function') {

                            p = new Promise(function (resolve, reject) {
                                resolve(_this3._options.onChallenge(data[1], data[2]));
                            });

                            p.then(function (key) {

                                // Sending directly 'cause it's a challenge msg and no sessionId check is needed
                                _this3._ws.send(_this3._encode([_constants.WAMP_MSG_SPEC.AUTHENTICATE, key, {}]));
                            }).catch(function (e) {
                                _this3._ws.send(_this3._encode([_constants.WAMP_MSG_SPEC.ABORT, { message: 'Exception in onChallenge handler raised!' }, 'wamp.error.cannot_authenticate']));
                                if (_this3._options.onError) {
                                    _this3._options.onError(_constants.WAMP_ERROR_MSG.CRA_EXCEPTION.description);
                                }
                                _this3._ws.close();
                                _this3._cache.opStatus = _constants.WAMP_ERROR_MSG.CRA_EXCEPTION;
                            });
                        } else {

                            this._ws.send(this._encode([_constants.WAMP_MSG_SPEC.ABORT, { message: _constants.WAMP_ERROR_MSG.NO_CRA_CB_OR_ID.description }, 'wamp.error.cannot_authenticate']));
                            if (this._options.onError) {
                                this._options.onError(_constants.WAMP_ERROR_MSG.NO_CRA_CB_OR_ID.description);
                            }
                            this._ws.close();
                            this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_CRA_CB_OR_ID;
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.GOODBYE:
                        // WAMP SPEC: [GOODBYE, Details|dict, Reason|uri]
                        if (!this._cache.isSayingGoodbye) {
                            // get goodbye, initiated by server
                            this._cache.isSayingGoodbye = true;
                            this._send([_constants.WAMP_MSG_SPEC.GOODBYE, {}, 'wamp.error.goodbye_and_out']);
                        }
                        this._cache.sessionId = null;
                        this._ws.close();
                        break;
                    case _constants.WAMP_MSG_SPEC.ERROR:
                        // WAMP SPEC: [ERROR, REQUEST.Type|int, REQUEST.Request|id, Details|dict,
                        //             Error|uri, (Arguments|list, ArgumentsKw|dict)]
                        switch (data[1]) {
                            case _constants.WAMP_MSG_SPEC.SUBSCRIBE:
                            case _constants.WAMP_MSG_SPEC.UNSUBSCRIBE:
                            case _constants.WAMP_MSG_SPEC.PUBLISH:
                            case _constants.WAMP_MSG_SPEC.REGISTER:
                            case _constants.WAMP_MSG_SPEC.UNREGISTER:

                                this._requests[data[2]] && this._requests[data[2]].callbacks.onError && this._requests[data[2]].callbacks.onError(data[4], data[3], data[5], data[6]);
                                delete this._requests[data[2]];

                                break;
                            case _constants.WAMP_MSG_SPEC.INVOCATION:
                                break;
                            case _constants.WAMP_MSG_SPEC.CALL:

                                // WAMP SPEC: [ERROR, CALL, CALL.Request|id, Details|dict,
                                //             Error|uri, Arguments|list, ArgumentsKw|dict]
                                this._calls[data[2]] && this._calls[data[2]].onError && this._calls[data[2]].onError(data[4], data[3], data[5], data[6]);
                                delete this._calls[data[2]];

                                break;
                            default:
                                this._log('[wampy] Received non-compliant WAMP ERROR message');
                                break;
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.SUBSCRIBED:
                        // WAMP SPEC: [SUBSCRIBED, SUBSCRIBE.Request|id, Subscription|id]
                        if (this._requests[data[1]]) {
                            this._subscriptions[this._requests[data[1]].topic] = this._subscriptions[data[2]] = {
                                id: data[2],
                                callbacks: [this._requests[data[1]].callbacks.onEvent]
                            };

                            this._subsTopics.add(this._requests[data[1]].topic);

                            if (this._requests[data[1]].callbacks.onSuccess) {
                                this._requests[data[1]].callbacks.onSuccess();
                            }

                            delete this._requests[data[1]];
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.UNSUBSCRIBED:
                        // WAMP SPEC: [UNSUBSCRIBED, UNSUBSCRIBE.Request|id]
                        if (this._requests[data[1]]) {
                            id = this._subscriptions[this._requests[data[1]].topic].id;
                            delete this._subscriptions[this._requests[data[1]].topic];
                            delete this._subscriptions[id];

                            if (this._subsTopics.has(this._requests[data[1]].topic)) {
                                this._subsTopics.delete(this._requests[data[1]].topic);
                            }

                            if (this._requests[data[1]].callbacks.onSuccess) {
                                this._requests[data[1]].callbacks.onSuccess();
                            }

                            delete this._requests[data[1]];
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.PUBLISHED:
                        // WAMP SPEC: [PUBLISHED, PUBLISH.Request|id, Publication|id]
                        if (this._requests[data[1]]) {
                            if (this._requests[data[1]].callbacks && this._requests[data[1]].callbacks.onSuccess) {
                                this._requests[data[1]].callbacks.onSuccess();
                            }

                            delete this._requests[data[1]];
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.EVENT:
                        if (this._subscriptions[data[1]]) {

                            // WAMP SPEC: [EVENT, SUBSCRIBED.Subscription|id, PUBLISHED.Publication|id,
                            //             Details|dict, PUBLISH.Arguments|list, PUBLISH.ArgumentKw|dict]

                            i = this._subscriptions[data[1]].callbacks.length;
                            while (i--) {
                                this._subscriptions[data[1]].callbacks[i](data[4], data[5]);
                            }
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.RESULT:
                        if (this._calls[data[1]]) {

                            // WAMP SPEC: [RESULT, CALL.Request|id, Details|dict,
                            //             YIELD.Arguments|list, YIELD.ArgumentsKw|dict]

                            this._calls[data[1]].onSuccess(data[3], data[4]);
                            if (!(data[2].progress && data[2].progress === true)) {
                                // We receive final result (progressive or not)
                                delete this._calls[data[1]];
                            }
                        }
                        break;
                    // case WAMP_MSG_SPEC.REGISTER:
                    //     // WAMP SPEC:
                    //     break;
                    case _constants.WAMP_MSG_SPEC.REGISTERED:
                        // WAMP SPEC: [REGISTERED, REGISTER.Request|id, Registration|id]
                        if (this._requests[data[1]]) {
                            this._rpcRegs[this._requests[data[1]].topic] = this._rpcRegs[data[2]] = {
                                id: data[2],
                                callbacks: [this._requests[data[1]].callbacks.rpc]
                            };

                            this._rpcNames.add(this._requests[data[1]].topic);

                            if (this._requests[data[1]].callbacks && this._requests[data[1]].callbacks.onSuccess) {
                                this._requests[data[1]].callbacks.onSuccess();
                            }

                            delete this._requests[data[1]];
                        }
                        break;
                    // case WAMP_MSG_SPEC.UNREGISTER:
                    //     // WAMP SPEC:
                    //     break;
                    case _constants.WAMP_MSG_SPEC.UNREGISTERED:
                        // WAMP SPEC: [UNREGISTERED, UNREGISTER.Request|id]
                        if (this._requests[data[1]]) {
                            id = this._rpcRegs[this._requests[data[1]].topic].id;
                            delete this._rpcRegs[this._requests[data[1]].topic];
                            delete this._rpcRegs[id];

                            if (this._rpcNames.has(this._requests[data[1]].topic)) {
                                this._rpcNames.delete(this._requests[data[1]].topic);
                            }

                            if (this._requests[data[1]].callbacks && this._requests[data[1]].callbacks.onSuccess) {
                                this._requests[data[1]].callbacks.onSuccess();
                            }

                            delete this._requests[data[1]];
                        }
                        break;
                    case _constants.WAMP_MSG_SPEC.INVOCATION:
                        if (this._rpcRegs[data[2]]) {

                            // WAMP SPEC: [INVOCATION, Request|id, REGISTERED.Registration|id,
                            //             Details|dict, CALL.Arguments|list, CALL.ArgumentsKw|dict]

                            p = new Promise(function (resolve, reject) {
                                resolve(_this3._rpcRegs[data[2]].callbacks[0](data[4], data[5], data[3]));
                            });

                            p.then(function (results) {
                                // WAMP SPEC: [YIELD, INVOCATION.Request|id, Options|dict, (Arguments|list, ArgumentsKw|dict)]
                                msg = [_constants.WAMP_MSG_SPEC.YIELD, data[1], {}];
                                if (_this3._isArray(results)) {
                                    // Options
                                    if (_this3._isPlainObject(results[0])) {
                                        msg[2] = results[0];
                                    }

                                    if (_this3._isArray(results[1])) {
                                        msg.push(results[1]);
                                    } else if (typeof results[1] !== 'undefined') {
                                        msg.push([results[1]]);
                                    }

                                    if (_this3._isPlainObject(results[2])) {
                                        if (msg.length === 3) {
                                            msg.push([]);
                                        }
                                        msg.push(results[2]);
                                    }
                                } else {
                                    msg = [_constants.WAMP_MSG_SPEC.YIELD, data[1], {}];
                                }
                                _this3._send(msg);
                            }).catch(function (e) {
                                var msg = [_constants.WAMP_MSG_SPEC.ERROR, _constants.WAMP_MSG_SPEC.INVOCATION, data[1], e.details || {}, e.uri || 'wamp.error.invocation_exception'];

                                if (e.argsList && _this3._isArray(e.argsList)) {
                                    msg.push(e.argsList);
                                }

                                if (e.argsDict && _this3._isPlainObject(e.argsDict)) {
                                    if (msg.length === 5) {
                                        msg.push([]);
                                    }
                                    msg.push(e.argsDict);
                                }
                                _this3._send(msg);
                            });
                        } else {
                            // WAMP SPEC: [ERROR, INVOCATION, INVOCATION.Request|id, Details|dict, Error|uri]
                            this._send([_constants.WAMP_MSG_SPEC.ERROR, _constants.WAMP_MSG_SPEC.INVOCATION, data[1], {}, 'wamp.error.no_such_procedure']);
                            this._cache.opStatus = _constants.WAMP_ERROR_MSG.NON_EXIST_RPC_INVOCATION;
                        }

                        break;
                    // case WAMP_MSG_SPEC.INTERRUPT:
                    //     // WAMP SPEC:
                    //     break;
                    // case WAMP_MSG_SPEC.YIELD:
                    //     // WAMP SPEC:
                    //     break;
                    default:
                        this._log('[wampy] Received non-compliant WAMP message');
                        break;
                }
            }
        }, {
            key: '_wsOnError',
            value: function _wsOnError(error) {
                this._log('[wampy] websocket error');

                if (this._options.onError) {
                    this._options.onError(error);
                }
            }
        }, {
            key: '_wsReconnect',
            value: function _wsReconnect() {
                this._log('[wampy] websocket reconnecting...');

                if (this._options.onReconnect) {
                    this._options.onReconnect();
                }

                this._cache.reconnectingAttempts++;
                this._ws = (0, _utils.getWebSocket)(this._url, this._protocols, this._options.ws);
                this._initWsCallbacks();
            }
        }, {
            key: '_renewSubscriptions',
            value: function _renewSubscriptions() {
                var i = void 0;
                var subs = this._subscriptions,
                    st = this._subsTopics;

                this._subscriptions = {};
                this._subsTopics = new Set();

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = st[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var topic = _step.value;

                        i = subs[topic].callbacks.length;
                        while (i--) {
                            this.subscribe(topic, subs[topic].callbacks[i]);
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        }, {
            key: '_renewRegistrations',
            value: function _renewRegistrations() {
                var rpcs = this._rpcRegs,
                    rn = this._rpcNames;

                this._rpcRegs = {};
                this._rpcNames = new Set();

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = rn[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var rpcName = _step2.value;

                        this.register(rpcName, { rpc: rpcs[rpcName].callbacks[0] });
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        }, {
            key: 'options',
            value: function options(opts) {
                if (typeof opts === 'undefined') {
                    return this._options;
                } else if (this._isPlainObject(opts)) {
                    this._options = this._merge(this._options, opts);
                    return this;
                }
            }
        }, {
            key: 'getOpStatus',
            value: function getOpStatus() {
                return this._cache.opStatus;
            }
        }, {
            key: 'getSessionId',
            value: function getSessionId() {
                return this._cache.sessionId;
            }
        }, {
            key: 'connect',
            value: function connect(url) {
                if (url) {
                    this._url = url;
                }

                if (this._options.realm) {

                    var authp = (this._options.authid ? 1 : 0) + (this._isArray(this._options.authmethods) && this._options.authmethods.length ? 1 : 0) + (typeof this._options.onChallenge === 'function' ? 1 : 0);

                    if (authp > 0 && authp < 3) {
                        this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_CRA_CB_OR_ID;
                        return this;
                    }

                    this._setWsProtocols();
                    this._ws = (0, _utils.getWebSocket)(this._url, this._protocols, this._options.ws);
                    if (!this._ws) {
                        this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_WS_OR_URL;
                        return this;
                    }
                    this._initWsCallbacks();
                } else {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_REALM;
                }

                return this;
            }
        }, {
            key: 'disconnect',
            value: function disconnect() {
                if (this._cache.sessionId) {
                    // need to send goodbye message to server
                    this._cache.isSayingGoodbye = true;
                    this._send([_constants.WAMP_MSG_SPEC.GOODBYE, {}, 'wamp.error.system_shutdown']);
                } else if (this._ws) {
                    this._ws.close();
                }

                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;

                return this;
            }
        }, {
            key: 'abort',
            value: function abort() {

                if (!this._cache.sessionId && this._ws.readyState === 1) {
                    this._send([_constants.WAMP_MSG_SPEC.ABORT, {}, 'wamp.error.abort']);
                    this._cache.sessionId = null;
                }

                this._ws.close();
                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;

                return this;
            }
        }, {
            key: 'subscribe',
            value: function subscribe(topicURI, callbacks) {
                var reqId = void 0;

                if (!this._preReqChecks(topicURI, 'broker', callbacks)) {
                    return this;
                }

                if (typeof callbacks === 'function') {
                    callbacks = { onEvent: callbacks };
                } else if (!this._isPlainObject(callbacks) || typeof callbacks.onEvent === 'undefined') {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_CALLBACK_SPEC;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }

                    return this;
                }

                if (!this._subscriptions[topicURI] || !this._subscriptions[topicURI].callbacks.length) {
                    // no such subscription or processing unsubscribing

                    reqId = this._getReqId();

                    this._requests[reqId] = {
                        topic: topicURI,
                        callbacks: callbacks
                    };

                    // WAMP SPEC: [SUBSCRIBE, Request|id, Options|dict, Topic|uri]
                    this._send([_constants.WAMP_MSG_SPEC.SUBSCRIBE, reqId, {}, topicURI]);
                } else {
                    // already have subscription to this topic
                    // There is no such callback yet
                    if (this._subscriptions[topicURI].callbacks.indexOf(callbacks.onEvent) < 0) {
                        this._subscriptions[topicURI].callbacks.push(callbacks.onEvent);
                    }

                    if (callbacks.onSuccess) {
                        callbacks.onSuccess();
                    }
                }

                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                this._cache.opStatus.reqId = reqId;
                return this;
            }
        }, {
            key: 'unsubscribe',
            value: function unsubscribe(topicURI, callbacks) {
                var reqId = void 0,
                    i = -1;

                if (!this._preReqChecks(null, 'broker', callbacks)) {
                    return this;
                }

                if (this._subscriptions[topicURI]) {

                    reqId = this._getReqId();

                    if (typeof callbacks === 'undefined') {
                        this._subscriptions[topicURI].callbacks = [];
                        callbacks = {};
                    } else if (typeof callbacks === 'function') {
                        i = this._subscriptions[topicURI].callbacks.indexOf(callbacks);
                        callbacks = {};
                    } else if (callbacks.onEvent && typeof callbacks.onEvent === 'function') {
                        i = this._subscriptions[topicURI].callbacks.indexOf(callbacks.onEvent);
                    } else {
                        this._subscriptions[topicURI].callbacks = [];
                    }

                    if (i >= 0) {
                        this._subscriptions[topicURI].callbacks.splice(i, 1);
                    }

                    if (this._subscriptions[topicURI].callbacks.length) {
                        // There are another callbacks for this topic
                        this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                        return this;
                    }

                    this._requests[reqId] = {
                        topic: topicURI,
                        callbacks: callbacks
                    };

                    // WAMP_SPEC: [UNSUBSCRIBE, Request|id, SUBSCRIBED.Subscription|id]
                    this._send([_constants.WAMP_MSG_SPEC.UNSUBSCRIBE, reqId, this._subscriptions[topicURI].id]);
                } else {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NON_EXIST_UNSUBSCRIBE;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }

                    return this;
                }

                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                this._cache.opStatus.reqId = reqId;
                return this;
            }
        }, {
            key: 'publish',
            value: function publish(topicURI, payload, callbacks, advancedOptions) {
                var reqId = void 0,
                    msg = void 0,
                    err = false;
                var options = {};

                if (!this._preReqChecks(topicURI, 'broker', callbacks)) {
                    return this;
                }

                if (this._isPlainObject(callbacks)) {
                    options.acknowledge = true;
                }

                if (typeof advancedOptions !== 'undefined') {

                    if (this._isPlainObject(advancedOptions)) {
                        if (advancedOptions.exclude) {
                            if (this._isArray(advancedOptions.exclude) && advancedOptions.exclude.length) {
                                options.exclude = advancedOptions.exclude;
                            } else if (typeof advancedOptions.exclude === 'number') {
                                options.exclude = [advancedOptions.exclude];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.exclude_authid) {
                            if (this._isArray(advancedOptions.exclude_authid) && advancedOptions.exclude_authid.length) {
                                options.exclude_authid = advancedOptions.exclude_authid;
                            } else if (typeof advancedOptions.exclude_authid === 'string') {
                                options.exclude_authid = [advancedOptions.exclude_authid];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.exclude_authrole) {
                            if (this._isArray(advancedOptions.exclude_authrole) && advancedOptions.exclude_authrole.length) {
                                options.exclude_authrole = advancedOptions.exclude_authrole;
                            } else if (typeof advancedOptions.exclude_authrole === 'string') {
                                options.exclude_authrole = [advancedOptions.exclude_authrole];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.eligible) {
                            if (this._isArray(advancedOptions.eligible) && advancedOptions.eligible.length) {
                                options.eligible = advancedOptions.eligible;
                            } else if (typeof advancedOptions.eligible === 'number') {
                                options.eligible = [advancedOptions.eligible];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.eligible_authid) {
                            if (this._isArray(advancedOptions.eligible_authid) && advancedOptions.eligible_authid.length) {
                                options.eligible_authid = advancedOptions.eligible_authid;
                            } else if (typeof advancedOptions.eligible_authid === 'string') {
                                options.eligible_authid = [advancedOptions.eligible_authid];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.eligible_authrole) {
                            if (this._isArray(advancedOptions.eligible_authrole) && advancedOptions.eligible_authrole.length) {
                                options.eligible_authrole = advancedOptions.eligible_authrole;
                            } else if (typeof advancedOptions.eligible_authrole === 'string') {
                                options.eligible_authrole = [advancedOptions.eligible_authrole];
                            } else {
                                err = true;
                            }
                        }

                        if (advancedOptions.hasOwnProperty('exclude_me')) {
                            options.exclude_me = advancedOptions.exclude_me !== false;
                        }

                        if (advancedOptions.hasOwnProperty('disclose_me')) {
                            options.disclose_me = advancedOptions.disclose_me === true;
                        }
                    } else {
                        err = true;
                    }

                    if (err) {
                        this._cache.opStatus = _constants.WAMP_ERROR_MSG.INVALID_PARAM;

                        if (this._isPlainObject(callbacks) && callbacks.onError) {
                            callbacks.onError(this._cache.opStatus.description);
                        }

                        return this;
                    }
                }

                reqId = this._getReqId();

                switch (arguments.length) {
                    case 1:
                        // WAMP_SPEC: [PUBLISH, Request|id, Options|dict, Topic|uri]
                        msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI];
                        break;
                    case 2:
                        // WAMP_SPEC: [PUBLISH, Request|id, Options|dict, Topic|uri, Arguments|list (, ArgumentsKw|dict)]
                        if (this._isArray(payload)) {
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, payload];
                        } else if (this._isPlainObject(payload)) {
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, [], payload];
                        } else {
                            // assume it's a single value
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, [payload]];
                        }
                        break;
                    default:
                        this._requests[reqId] = {
                            topic: topicURI,
                            callbacks: callbacks
                        };

                        // WAMP_SPEC: [PUBLISH, Request|id, Options|dict, Topic|uri, Arguments|list (, ArgumentsKw|dict)]
                        if (this._isArray(payload)) {
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, payload];
                        } else if (this._isPlainObject(payload)) {
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, [], payload];
                        } else {
                            // assume it's a single value
                            msg = [_constants.WAMP_MSG_SPEC.PUBLISH, reqId, options, topicURI, [payload]];
                        }
                        break;
                }

                this._send(msg);
                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                this._cache.opStatus.reqId = reqId;
                return this;
            }
        }, {
            key: 'call',
            value: function call(topicURI, payload, callbacks, advancedOptions) {
                var reqId = void 0,
                    msg = void 0,
                    err = false;
                var options = {};

                if (!this._preReqChecks(topicURI, 'dealer', callbacks)) {
                    return this;
                }

                if (typeof callbacks === 'function') {
                    callbacks = { onSuccess: callbacks };
                } else if (!this._isPlainObject(callbacks) || typeof callbacks.onSuccess === 'undefined') {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_CALLBACK_SPEC;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }

                    return this;
                }

                if (typeof advancedOptions !== 'undefined') {

                    if (this._isPlainObject(advancedOptions)) {
                        if (advancedOptions.hasOwnProperty('disclose_me')) {
                            options.disclose_me = advancedOptions.disclose_me === true;
                        }

                        if (advancedOptions.hasOwnProperty('receive_progress')) {
                            options.receive_progress = advancedOptions.receive_progress === true;
                        }

                        if (advancedOptions.hasOwnProperty('timeout')) {
                            if (typeof advancedOptions.timeout === 'number') {
                                options.timeout = advancedOptions.timeout;
                            } else {
                                err = true;
                            }
                        }
                    } else {
                        err = true;
                    }

                    if (err) {
                        this._cache.opStatus = _constants.WAMP_ERROR_MSG.INVALID_PARAM;

                        if (this._isPlainObject(callbacks) && callbacks.onError) {
                            callbacks.onError(this._cache.opStatus.description);
                        }

                        return this;
                    }
                }

                do {
                    reqId = this._getReqId();
                } while (reqId in this._calls);

                this._calls[reqId] = callbacks;

                // WAMP SPEC: [CALL, Request|id, Options|dict, Procedure|uri, (Arguments|list, ArgumentsKw|dict)]
                if (payload === null) {
                    msg = [_constants.WAMP_MSG_SPEC.CALL, reqId, options, topicURI];
                } else {
                    if (this._isArray(payload)) {
                        msg = [_constants.WAMP_MSG_SPEC.CALL, reqId, options, topicURI, payload];
                    } else if (this._isPlainObject(payload)) {
                        msg = [_constants.WAMP_MSG_SPEC.CALL, reqId, options, topicURI, [], payload];
                    } else {
                        // assume it's a single value
                        msg = [_constants.WAMP_MSG_SPEC.CALL, reqId, options, topicURI, [payload]];
                    }
                }

                this._send(msg);
                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                this._cache.opStatus.reqId = reqId;
                return this;
            }
        }, {
            key: 'cancel',
            value: function cancel(reqId, callbacks, advancedOptions) {
                var options = { mode: 'skip' };

                if (!this._preReqChecks(null, 'dealer', callbacks)) {
                    return this;
                }

                if (!reqId || !this._calls[reqId]) {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NON_EXIST_RPC_REQ_ID;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }

                    return this;
                }

                if (typeof advancedOptions !== 'undefined' && this._isPlainObject(advancedOptions) && advancedOptions.hasOwnProperty('mode')) {

                    options.mode = /skip|kill|killnowait/.test(advancedOptions.mode) ? advancedOptions.mode : 'skip';
                }

                // WAMP SPEC: [CANCEL, CALL.Request|id, Options|dict]
                this._send([_constants.WAMP_MSG_SPEC.CANCEL, reqId, options]);
                this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                this._cache.opStatus.reqId = reqId;

                callbacks.onSuccess && callbacks.onSuccess();

                return this;
            }
        }, {
            key: 'register',
            value: function register(topicURI, callbacks) {
                var reqId = void 0;

                if (!this._preReqChecks(topicURI, 'dealer', callbacks)) {
                    return this;
                }

                if (typeof callbacks === 'function') {
                    callbacks = { rpc: callbacks };
                } else if (!this._isPlainObject(callbacks) || typeof callbacks.rpc === 'undefined') {
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NO_CALLBACK_SPEC;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }

                    return this;
                }

                if (!this._rpcRegs[topicURI] || !this._rpcRegs[topicURI].callbacks.length) {
                    // no such registration or processing unregistering

                    reqId = this._getReqId();

                    this._requests[reqId] = {
                        topic: topicURI,
                        callbacks: callbacks
                    };

                    // WAMP SPEC: [REGISTER, Request|id, Options|dict, Procedure|uri]
                    this._send([_constants.WAMP_MSG_SPEC.REGISTER, reqId, {}, topicURI]);
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                    this._cache.opStatus.reqId = reqId;
                } else {
                    // already have registration with such topicURI
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.RPC_ALREADY_REGISTERED;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }
                }

                return this;
            }
        }, {
            key: 'unregister',
            value: function unregister(topicURI, callbacks) {
                var reqId = void 0;

                if (!this._preReqChecks(topicURI, 'dealer', callbacks)) {
                    return this;
                }

                if (typeof callbacks === 'function') {
                    callbacks = { onSuccess: callbacks };
                }

                if (this._rpcRegs[topicURI]) {
                    // there is such registration

                    reqId = this._getReqId();

                    this._requests[reqId] = {
                        topic: topicURI,
                        callbacks: callbacks
                    };

                    // WAMP SPEC: [UNREGISTER, Request|id, REGISTERED.Registration|id]
                    this._send([_constants.WAMP_MSG_SPEC.UNREGISTER, reqId, this._rpcRegs[topicURI].id]);
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.SUCCESS;
                    this._cache.opStatus.reqId = reqId;
                } else {
                    // there is no registration with such topicURI
                    this._cache.opStatus = _constants.WAMP_ERROR_MSG.NON_EXIST_RPC_UNREG;

                    if (this._isPlainObject(callbacks) && callbacks.onError) {
                        callbacks.onError(this._cache.opStatus.description);
                    }
                }

                return this;
            }
        }]);

        return Wampy;
    }();

    exports.default = Wampy;
    exports.Wampy = Wampy;
});
//# sourceMappingURL=wampy.js.map