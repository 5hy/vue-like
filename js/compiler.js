import Watcher from './watcher';
import Component from './Component';
import { getGlobalComponents } from './vue-like';
let idx = 0; //临时禁止过多嵌套
export default class Compiler {
    constructor(fragement, vm) {
        this.fragement = fragement;
        this.vm = vm;
        this.compile(this.fragement.childNodes)
    }
    getCompiledFragement() {
        return this.fragement;
    }
    isDetective(name) {
        return name.includes('v-');
    }
    isCustomComponent(node) {
        return getGlobalComponents()[node.nodeName.toLowerCase()];
    }
    isElementNode(node) {
        return node.nodeType === 1;
    }
    getValueByExp(exp) {
        return exp.split('.').reduce((last, k) => {
            return last[k]
        }, this.vm.$data)
    }
    nodeInteractive(node, expr) {
        node.addEventListener('input', (e) => {
            const exprArr = expr.split('.');
            const len = exprArr.length;
            let idx = 0;
            exprArr.reduce((last, k) => {
                idx++
                if (idx === len) {
                    last[k] = e.target.value;
                    return
                }
                return last[k]
            }, this.vm.$data)
        })
    }
    compileNode(node) {
        if (node.getAttribute('v') != null) return;
        node.setAttribute('v', '');
        const attrlist = node.attributes;
        [...attrlist].forEach(({ name, value }) => {
            if (!this.isDetective(name)) return;
            const commander = name.replace('v-', '')
            new Watcher(node, value, this.vm, () => {
                utils[commander](node, this.getValueByExp(value))
            });
            utils[commander](node, this.getValueByExp(value));
            this.nodeInteractive(node, value)
        })
        // 递归处理node节点的子节点
        this.compile(node.childNodes);
    }
    updateText(node, expr) {
        node.textContent = expr.replace(/{{([^}]+)}}/g, (...k) => {
            return this.getValueByExp(k[1])
        })
    }
    compileText(node) {
        const expr = node.textContent;
        node.textContent = expr.replace(/{{([^}]+)}}/g, (...k) => {
            new Watcher(node, k[1], this.vm, () => {
                this.updateText(node, expr)
            });
            return this.getValueByExp(k[1])
        })
    }
    compile(children) {
        // forEach to loop children cause some node been skipped. loop by for to maniplate the i and len to solve this bug.
        for (let i = 0, len = children.length; i < len; i++) {
            const node = children[i];
            if (this.isCustomComponent(node)) {
                const nodeName = node.nodeName.toLowerCase();
                const comOption = getGlobalComponents()[nodeName];
                if (idx < 921 && comOption != null) {
                    idx++
                    comOption.beforeCreated && comOption.beforeCreated();
                    const comVm = new Component(comOption);
                    comVm.created();
                    const comVMNodes = comVm.compile();
                    comVm.beforeMounted();
                    const increasedLen = comVMNodes.childNodes.length;
                    node.replaceWith(comVMNodes);
                    comVm.mounted();
                    i += increasedLen - 1;
                    len += increasedLen - 1;
                }
            } else if (this.isElementNode(node)) {
                this.compileNode(node)
            } else {
                this.compileText(node)
            }
        }
    }
}

const utils = {
    model(node, value) {
        node.value = value;
    }
}