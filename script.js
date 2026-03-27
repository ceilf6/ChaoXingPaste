(function() {
    // 1. 强制覆盖 document 和 window 的切屏检测属性
    const hackVisibility = (doc) => {
        try {
            Object.defineProperty(doc, 'hidden', { value: false, configurable: true });
            Object.defineProperty(doc, 'visibilityState', { value: 'visible', configurable: true });
            Object.defineProperty(doc, 'webkitVisibilityState', { value: 'visible', configurable: true });
        } catch (e) {}
    };

    // 2. 暴力拦截所有可能导致警告或阻止粘贴的事件
    const blockEvents = [
        'visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange',
        'blur', 'focusout', 'mouseleave',
        'copy', 'cut', 'paste', 'selectstart', 'contextmenu'
    ];

    const stopPropagation = (e) => {
        e.stopImmediatePropagation();
        // 只有切屏相关的事件我们才阻止默认行为，复制粘贴等保留默认（也就是允许）
        if (['blur', 'visibilitychange', 'focusout', 'mouseleave'].includes(e.type)) {
            e.preventDefault();
        }
        return true; 
    };

    // 3. 将破解应用到当前窗口及所有内部的 iframe
    const applyCrack = (targetWin, targetDoc) => {
        if (!targetWin || !targetDoc) return;

        hackVisibility(targetDoc);

        // 拦截事件源头 (捕获阶段拦截)
        blockEvents.forEach(eventType => {
            targetWin.addEventListener(eventType, stopPropagation, true);
            targetDoc.addEventListener(eventType, stopPropagation, true);
        });

        // 暴力解除内联限制
        targetWin.onblur = null;
        targetWin.onmouseleave = null;
        targetDoc.onvisibilitychange = null;
        targetDoc.oncontextmenu = null;
        targetDoc.onselectstart = null;
        targetDoc.oncopy = null;
        targetDoc.onpaste = null;
        if(targetDoc.body) {
            targetDoc.body.onselectstart = null;
            targetDoc.body.oncopy = null;
            targetDoc.body.onpaste = null;
        }

        // 注入强制可选中的 CSS
        const style = targetDoc.createElement('style');
        style.innerHTML = `
            * {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
            }
        `;
        if (targetDoc.head) targetDoc.head.appendChild(style);
    };

    const run = () => {
        // 作用于主页面
        applyCrack(window, document);
        
        // 尝试作用于所有 iframe (超星经常把题目嵌套在 iframe 里)
        const frames = document.querySelectorAll('iframe');
        frames.forEach(frame => {
            try {
                if (frame.contentWindow && frame.contentDocument) {
                    applyCrack(frame.contentWindow, frame.contentDocument);
                }
            } catch (e) {
                // 跨域 iframe 可能会报错，忽略即可
            }
        });
        
        // 如果页面使用了 jQuery，解绑相关事件
        if (typeof $ !== "undefined") {
            $(document).unbind("paste copy blur visibilitychange");
            $("body").unbind("paste copy blur visibilitychange");
            $("input, textarea, .edui-editor-body").unbind("paste drop contextmenu");
        }
    };

    // 立即执行一次
    run();
    
    // 每 1.5 秒循环一次，对抗页面的动态加载和 UEditor 初始化
    setInterval(run, 1500);

    // 专门针对编辑器中的富文本 (UEditor)
    setInterval(() => {
        if (typeof UE !== 'undefined') {
            for (let id in UE.instants) {
                let editor = UE.instants[id];
                if (editor && editor.body) {
                    editor.body.onpaste = null;
                    editor.body.oncopy = null;
                }
            }
        }
    }, 2000);
})();