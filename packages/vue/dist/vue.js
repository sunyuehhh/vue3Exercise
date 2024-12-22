var Vue = (function (exports) {
    'use strict';

    const isArray = (val) => {
        return Array.isArray(val);
    };
    const isObject = (val) => {
        return val !== null && typeof val === "object";
    };
    const hasChanged = (value, oldValue) => {
        return !Object.is(value, oldValue);
    };
    const isFunction = (val) => {
        return typeof val === "function";
    };
    const isString = (val) => {
        return typeof val == "string";
    };
    const extend = Object.assign;
    const onRE = /^on[^a-z]/;
    const isOn = (key) => onRE.test(key);

    const createDep = (effects) => {
        const dep = new Set(effects);
        return dep;
    };

    const targetMap = new WeakMap();
    function effect(fn) {
        const _effect = new ReactiveEffect(fn);
        _effect.run();
    }
    let activeEffect;
    class ReactiveEffect {
        constructor(fn, scheduler = null) {
            this.fn = fn;
            this.scheduler = scheduler;
        }
        run() {
            activeEffect = this;
            return this.fn();
        }
    }
    /**
     * 收集依赖
     * @param target
     * @param key
     */
    function track(target, key) {
        console.log("收集依赖", target, key);
        if (!activeEffect)
            return;
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
    function trackEffects(dep) {
        dep.add(activeEffect);
    }
    /**
     * 触发依赖
     * @param target
     * @param key
     * @param value
     */
    function trigger(target, key, newValue) {
        console.log("触发依赖", target, key, newValue);
        const depsMap = targetMap.get(target);
        if (!depsMap) {
            return;
        }
        const dep = depsMap.get(key);
        if (!dep) {
            return;
        }
        triggerEffects(dep);
    }
    /**
     * 依次触发 dep 总保存的依赖
     * @param dep
     */
    function triggerEffects(dep) {
        const effects = isArray(dep) ? dep : [...dep];
        // 依次触发依赖
        for (const effect of effects) {
            if (effect.computed) {
                triggerEffect(effect);
            }
            if (!effect.computed) {
                triggerEffect(effect);
            }
        }
    }
    /**
     * 触发指定依赖
     * @param effect
     */
    function triggerEffect(effect) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }

    const get = createGetter();
    function createGetter() {
        return function get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver);
            track(target, key);
            return res;
        };
    }
    const set = createSetter();
    function createSetter() {
        return function set(target, key, value, receiver) {
            const result = Reflect.set(target, key, value, receiver);
            trigger(target, key, value);
            return result;
        };
    }
    const mutableHandlers = {
        get,
        set,
    };

    const reactiveMap = new WeakMap();
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    function createReactiveObject(target, baseHandler, proxyMap) {
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        const proxy = new Proxy(target, baseHandler);
        proxyMap.set(target, proxy);
        return proxy;
    }
    const toReactive = (value) => {
        return isObject(value) ? reactive(value) : value;
    };

    function ref(value) {
        return createRef(value, false);
    }
    function createRef(rawValue, shallow) {
        if (isRef(rawValue)) {
            return rawValue;
        }
        return new RefImpl(rawValue, shallow);
    }
    class RefImpl {
        constructor(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            this.dep = undefined;
            this.__v_isRef = true;
            this._rawValue = value;
            this._value = __v_isShallow ? value : toReactive(value);
        }
        get value() {
            trackRefValue(this);
            return this._value;
        }
        set value(newVal) {
            if (hasChanged(newVal, this._rawValue)) {
                this._rawValue = newVal;
                this._value = toReactive(newVal);
                triggerRefValue(this);
            }
        }
    }
    /**
     * 触发依赖
     * @param ref
     */
    function triggerRefValue(ref) {
        if (ref.dep) {
            triggerEffects(ref.dep);
        }
    }
    /**
     * 收集依赖
     * @param ref
     */
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    /**
     * 是否为ref
     * @param r
     * @returns
     */
    function isRef(r) {
        return !!(r && r.__v_isRef === true);
    }

    class ComputedRefImpl {
        constructor(getter) {
            this.dep = undefined;
            this.__v_isRef = true;
            this._dirty = true;
            this.effect = new ReactiveEffect(getter, () => {
                if (!this._dirty) {
                    this._dirty = true;
                    console.log("变化", this);
                    triggerRefValue(this);
                }
            });
            this.effect.computed = this;
        }
        get value() {
            console.log(this, "this");
            trackRefValue(this);
            if (this._dirty) {
                this._dirty = false;
                this._value = this.effect.run();
            }
            return this._value;
        }
    }
    function computed(getterOrOptions) {
        let getter;
        const onlyGetter = isFunction(getterOrOptions);
        if (onlyGetter) {
            getter = getterOrOptions;
        }
        const cRef = new ComputedRefImpl(getter);
        return cRef;
    }

    function queuePreFlushCb(cb) {
    }

    const Fragment = Symbol("Fragment");
    const Text = Symbol("Text");
    const Comment$1 = Symbol("Comment");
    function createVNode(type, props, children) {
        if (props) {
            let { class: klass, style } = props;
            if (klass && !isString(klass)) {
                props.class = normalizeClass(klass);
            }
        }
        const shapeFlag = isString(type)
            ? 1 /* ShapeFlags.ELEMENT */
            : isObject(type)
                ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
                : 0;
        return createBaseVNode(type, props, children, shapeFlag);
    }
    function createBaseVNode(type, props, children, shapeFlag) {
        const vnode = {
            __v_isVNode: true,
            type,
            props,
            shapeFlag,
        };
        normalizeChildren(vnode, children);
        return vnode;
    }
    function normalizeChildren(vnode, children) {
        let type = 0;
        if (children == null) {
            children = null;
        }
        else if (isArray(children)) {
            type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
        }
        else if (typeof children == "object") ;
        else if (isFunction(children)) ;
        else {
            // children就是字符串
            children = String(children);
            type = 8 /* ShapeFlags.TEXT_CHILDREN */;
        }
        vnode.children = children;
        vnode.shapeFlag |= type;
    }
    function isVNode(value) {
        return value ? value.__v_isRef == true : false;
    }
    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }

    function h(type, propsOrChildren, children) {
        let l = arguments.length;
        if (l == 2) {
            if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
                if (isVNode(propsOrChildren)) {
                    // 第二个参数是vNode的格式
                    return createVNode(type, null, [propsOrChildren]);
                }
                // 如果是对象
                return createVNode(type, propsOrChildren);
            }
            else {
                // 如果是数组的话
                return createVNode(type, null, propsOrChildren);
            }
        }
        else {
            // 如果不是两个参数
            if (l > 3) {
                children = Array.prototype.slice.call(arguments, 2);
            }
            else if (l == 3 && isVNode(children)) {
                children = [children];
            }
            return createVNode(type, propsOrChildren, children);
        }
    }

    let uid = 0;
    function createComponentInstance(vnode) {
        const type = vnode.type;
        const instance = {
            uid: uid++,
            vnode,
            type,
            subTree: null,
            effect: null,
            update: null,
            render: null,
        };
        return instance;
    }
    function setupComponent(instance) {
        setupStatefulComponent(instance);
    }
    function setupStatefulComponent(instance) {
        finishComponentSetup(instance);
    }
    function finishComponentSetup(instance) {
        const Component = instance.type;
        instance.render = Component.render;
        applyOptions(instance);
    }
    function applyOptions(instance) {
        const { data: dataOptions } = instance.type;
        if (dataOptions) {
            const data = dataOptions();
            if (isObject(data)) {
                instance.data = reactive(data);
            }
        }
    }

    function renderComponentRoot(instance) {
        const { vnode, render, data } = instance;
        let result;
        try {
            if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                result = normalizeVNode(render.call(data)); //执行render  拿到h函数渲染的vnode
            }
        }
        catch (error) {
            console.log(error);
        }
        return result;
    }
    function normalizeVNode(child) {
        if (typeof child === "object") {
            return cloneIfMounted(child);
        }
        else {
            return createVNode(Text, null, String(child));
        }
    }
    function cloneIfMounted(child) {
        return child;
    }

    const EMPTY_OBJ = {};
    function createRenderer(options) {
        return baseCreateRenderer(options);
    }
    function baseCreateRenderer(options) {
        const { insert: hostInsert, patchProp: hostPatchProp, createElement: hostCreateElement, setElementText: hostSetElementText, remove: hostRemove, createText: hostCreateText, setText: hostSetText, createComment: hostCreateComment, } = options;
        const processComponent = (oldVNode, newVNode, container, anchor) => {
            if (oldVNode == null) {
                mountComponent(newVNode, container, anchor);
            }
        };
        const mountComponent = (initialVNode, container, anchor) => {
            initialVNode.component = createComponentInstance(initialVNode);
            const instance = initialVNode.component;
            // 绑定render函数
            setupComponent(instance);
            // 渲染组件
            setupRenderEffect(instance, initialVNode, container, anchor);
        };
        const setupRenderEffect = (instance, initialVNode, container, anchor) => {
            const componentUpdateFn = () => {
                if (!instance.isMounted) {
                    const subTree = (instance.subTree = renderComponentRoot(instance));
                    patch(null, subTree, container, anchor);
                    initialVNode.el = subTree.el;
                }
            };
            const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => queuePreFlushCb(update)));
            const update = (instance.update = () => effect.run());
            update();
        };
        const processComment = (oldVNode, newVNode, container, anchor) => {
            if (oldVNode == null) {
                // 挂载
                newVNode.el = hostCreateComment(newVNode.children);
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                newVNode.el = oldVNode.el;
            }
        };
        const processText = (oldVNode, newVNode, container, anchor) => {
            console.log(oldVNode, newVNode, "oldVNode, newVNode");
            if (oldVNode == null) {
                newVNode.el = hostCreateText(newVNode.children);
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                const el = (newVNode.el = oldVNode.el);
                if (newVNode.children !== oldVNode.children) {
                    hostSetText(el, newVNode.children);
                }
            }
        };
        const processElement = (oldVNode, newVNode, container, anchor) => {
            if (oldVNode == null) {
                mountElement(newVNode, container, anchor);
            }
            else {
                // TODO:更新操作
                patchElement(oldVNode, newVNode);
            }
        };
        const mountElement = (vnode, container, anchor) => {
            // 1.创建 element
            // 2.设置文本
            // 3.设置  props
            // 4.插入
            const { type, props, shapeFlag } = vnode;
            const el = (vnode.el = hostCreateElement(type));
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText(el, vnode.children);
            }
            if (props) {
                for (const key in props) {
                    hostPatchProp(el, key, null, props[key]);
                }
            }
            hostInsert(el, container, anchor);
        };
        const patchElement = (oldVNode, newVNode) => {
            const el = (newVNode.el = oldVNode.el);
            const oldProps = oldVNode.props || EMPTY_OBJ;
            const newProps = newVNode.props || EMPTY_OBJ;
            patchChildren(oldVNode, newVNode, el);
            patchProps(el, newVNode, oldProps, newProps);
        };
        const patchChildren = (oldVNode, newVNode, container, anchor) => {
            console.log(oldVNode, newVNode, "patchChildren");
            const c1 = oldVNode && oldVNode.children;
            const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
            const c2 = newVNode && newVNode.children;
            const { shapeFlag } = newVNode;
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                if (c2 !== c1) {
                    // 挂载新子节点的文本
                    hostSetElementText(container, c2);
                }
            }
            else {
                if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) ;
                else {
                    // 旧节点不是array
                    if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                        // 旧节点是text
                        // 新节点不是text
                        // 删除旧节点text
                        hostSetElementText(container, "");
                    }
                }
            }
        };
        const patchProps = (el, vnode, oldProps, newProps) => {
            if (oldProps !== newProps) {
                for (let key in newProps) {
                    const next = newProps[key];
                    const prev = oldProps[key];
                    if (next !== prev) {
                        hostPatchProp(el, key, prev, next);
                    }
                }
                if (oldProps !== EMPTY_OBJ) {
                    for (let key in oldProps) {
                        if (!(key in newProps)) {
                            hostPatchProp(el, key, oldProps[key], null);
                        }
                    }
                }
            }
        };
        const patch = (oldVNode, newVNode, container, anchor = null) => {
            if (oldVNode == newVNode) {
                return;
            }
            if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
                unmount(oldVNode);
                oldVNode = null;
            }
            const { type, shapeFlag } = newVNode;
            switch (type) {
                case Text:
                    processText(oldVNode, newVNode, container, anchor);
                    break;
                case Comment:
                    processComment(oldVNode, newVNode, container, anchor);
                    break;
                case Fragment:
                    break;
                default:
                    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                        processElement(oldVNode, newVNode, container, anchor);
                    }
                    else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                        processComponent(oldVNode, newVNode, container, anchor);
                    }
            }
        };
        const unmount = (vnode) => {
            hostRemove(vnode.el);
        };
        const render = (vnode, container) => {
            if (vnode === null) {
                // 卸载
                unmount(container._vnode);
            }
            else {
                patch(container._vnode || null, vnode, container);
            }
            container._vnode = vnode;
        };
        return {
            render,
        };
    }

    function patchClass(el, value) {
        if (value == null) {
            el.removeAttribute("class");
        }
        else {
            el.className = value;
        }
    }

    function patchDOMProp(el, key, value) {
        try {
            el[key] = value;
        }
        catch (_a) { }
    }

    function patchAttr(el, key, value) {
        if (value === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, value);
        }
    }

    function patchStyle(el, prev, next) {
        const style = el.style;
        const isCssString = isString(next);
        if (next && !isCssString) {
            for (let key in next) {
                setStyle(style, key, next[key]);
            }
            if (prev && !isString(prev)) {
                for (const key in prev) {
                    if (next[key] == null) {
                        setStyle(style, key, "");
                    }
                }
            }
        }
    }
    function setStyle(style, name, val) {
        style[name] = val;
    }

    function patchEvent(el, rawName, prevValue, nextValue) {
        const invokers = el._vei || (el._vei = {});
        const existingInvoker = invokers[rawName];
        if (nextValue && existingInvoker) {
            existingInvoker.value = nextValue;
        }
        else {
            const name = parseName(rawName);
            if (nextValue) {
                // map里面找不到  nextValue有值  创建
                const invoker = (invokers[rawName] = createInvoker(nextValue));
                el.addEventListener(name, invoker);
            }
            else {
                // nextValue没有值  就删除
                el.removeEventListener(name, existingInvoker);
                invokers[rawName] = undefined;
            }
        }
    }
    function parseName(name) {
        return name.slice(2).toLowerCase();
    }
    function createInvoker(initialValue) {
        const invoker = (e) => {
            invoker.value && invoker.value();
        };
        invoker.value = initialValue;
        return invoker;
    }

    const patchProp = (el, key, prevValue, nextValue) => {
        if (key === "class") {
            patchClass(el, nextValue);
        }
        else if (key === "style") {
            patchStyle(el, prevValue, nextValue);
        }
        else if (isOn(key)) {
            patchEvent(el, key, prevValue, nextValue);
        }
        else if (shouldSetAsProp(el, key)) {
            patchDOMProp(el, key, nextValue); //el[key]
        }
        else {
            patchAttr(el, key, nextValue); //setAttribute
        }
    };
    function shouldSetAsProp(el, key) {
        if (key === "form") {
            return false;
        }
        if (key === "list" && el.tagName === "INPUT") {
            return false;
        }
        if (key === "type" && el.tagName === "TEXTAREA") {
            return false;
        }
        return key in el;
    }

    const doc = document;
    const nodeOps = {
        insert: (child, parent, anchor) => {
            parent.insertBefore(child, anchor || null);
        },
        createElement: (tag) => {
            const el = doc.createElement(tag);
            return el;
        },
        setElementText: (el, text) => {
            el.textContent = text;
        },
        remove(child) {
            const parent = child.parentNode;
            parent === null || parent === void 0 ? void 0 : parent.removeChild(child);
        },
        createText: (text) => {
            return doc.createTextNode(text);
        },
        setText(node, text) {
            node.nodeValue = text;
        },
        createComment: (text) => doc.createComment(text),
    };

    const rendererOptions = extend({ patchProp }, nodeOps);
    let renderer;
    function ensureRenderer() {
        return renderer || (renderer = createRenderer(rendererOptions));
    }
    const render = (...args) => {
        ensureRenderer().render(...args);
    };

    exports.Comment = Comment$1;
    exports.Fragment = Fragment;
    exports.Text = Text;
    exports.computed = computed;
    exports.effect = effect;
    exports.h = h;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.render = render;

    return exports;

})({});
//# sourceMappingURL=vue.js.map
