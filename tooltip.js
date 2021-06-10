class TooltipExpression {
    constructor(value, element) {
        this.text = value
        //this.value = value
        this.element = element
    }

    getValue() {
        return this.getAsConst()
    }

    getAsConst() {
        if (
            (this.text.startsWith("'") && this.text.endsWith("'")) ||
            (this.text.startsWith('"') && this.text.endsWith('"')) ||
            (this.text.startsWith("`") && this.text.endsWith("`"))
        ) {
            return this.text.substr(1, this.text.length-2)
        }

        if (this.text.toLowerCase() === 'true')  return true
        if (this.text.toLowerCase() === 'false') return false

        if (Tooltip.floatRegex.test(this.text)) {
            return parseFloat(Tooltip.floatRegex.exec(this.text)[0])
        }

        return this.text
    }

    getType() { // TODO: this should probably be better but meh
        
    }

    withText(text) {
        return this.with(text.toString())
    }

    with(value) {
        return new TooltipExpression(value, this.element)
    }

    static create(text, el) {
        if (Tooltip.formattingTernary.test(text)) {
            return new TooltipTernaryExpression(text, el)
        }
        if (Tooltip.formattingComparison.test(text)) {
            return new TooltipComparisonExpression(text, el)
        }
        if (Tooltip.formattingOperation.test(text)) {
            return new TooltipOperationExpression(text, el)
        }
        if (text.startsWith('el.') || text.startsWith('parent.')) {
            return new TooltipElementExpression(text, el)
        }
        if (text.startsWith('nav.')) {
            return new TooltipNavigatorExpression(text)
        }
        return new TooltipExpression(text, el)
    }
}

class TooltipFunctionExpression extends TooltipExpression {
    


    constructor(text, element) {
        super(text, element)

        let parsed = TooltipFunctionExpression.functionRegex.exec(text)

        this.name = parsed[1]
        this.args = parsed[2].split(',').map(a=>a.trim())
    }

    static getValue() {
        if (!TooltipFunctionExpression.functions[this.name]) return undefined
        return TooltipFunctionExpression.functions[this.name](...this.args)
    }

    static functions = {
        'element': function(id) {
            return document.getElementById(id)
        }
    }

    static functionRegex = /(\w[a-zA-Z0-9_]+)\((.+)\)/
}

class TooltipRawValueExpression extends TooltipExpression {
    constructor(value, element) {
        super(value.toString(), element)
        this.value = value
    }

    getValue() {
        return this.value
    }
}

class TooltipTernaryExpression extends TooltipExpression {
    constructor(text, element) {
        super(text, element)

        let params = Tooltip.formattingTernary.exec(this.text)

        this.condition = TooltipExpression.create(params[1], element)
        this.truthy = TooltipExpression.create(params[2], element)
        this.falsy = TooltipExpression.create(params[3], element)
    }

    getValue() {
        return this.isTruthy() ? this.getTruthy() : this.getFalsy()
    }

    isTruthy() {
        if (this.condition.getValue()) {
            return true
        }
        return false
    }

    getTruthy() {
        return this.truthy.getValue()
    }

    getFalsy() {
        return this.falsy.getValue()
    }
}

class TooltipSidedExpression extends TooltipExpression {
    constructor(text, element, regex) {
        super(text, element)
        this.regex = regex

        let params = this.regex.exec(this.text)

        this.leftSideExpr = TooltipExpression.create(params[1], element)
        this.rightSideExpr = TooltipExpression.create(params[3], element)
        this.operator = params[2]
    }

    getLeftValue() {
        return this.leftSideExpr.getValue()
    }

    getRightValue() {
        return this.rightSideExpr.getValue()
    }
}

class TooltipComparisonExpression extends TooltipSidedExpression {
    constructor(text, element) {
        super(text, element, Tooltip.formattingComparison)
    }

    getValue() {
        switch (this.operator) {
            case ">":   return this.getLeftValue() >   this.getRightValue()
            case ">=":  return this.getLeftValue() >=  this.getRightValue()
            case "<":   return this.getLeftValue() <   this.getRightValue()
            case "<=":  return this.getLeftValue() <=  this.getRightValue()
            case "==":  return this.getLeftValue() ==  this.getRightValue()
            case "===": return this.getLeftValue() === this.getRightValue()
            case "!=":  return this.getLeftValue() !=  this.getRightValue()
            case "!==": return this.getLeftValue() !== this.getRightValue()
            default:    return this.getLeftValue() ==  this.getRightValue()
        }
    }
}

class TooltipOperationExpression extends TooltipSidedExpression {
    constructor(text, element) {
        super(text, element, Tooltip.formattingOperation)
    }

    getValue() {
        switch (this.operator) {
            case "+": return this.getLeftValue() + this.getRightValue()
            case "-": return this.getLeftValue() - this.getRightValue()
            case "*": return this.getLeftValue() * this.getRightValue()
            case "/": return this.getLeftValue() / this.getRightValue()
            case "%": return this.getLeftValue() % this.getRightValue()
            case "^": return this.getLeftValue() ** this.getRightValue()
            default:  return this.getLeftValue() + this.getRightValue()
        }
    }
}

class TooltipNavigatorExpression extends TooltipExpression {
    constructor(text) {
        super(text, null)
    }

    getValue() {
        let prop = this.text.substr(4).toLowerCase()

        switch(prop) {
            case "ua":
            case "useragent": return navigator.userAgent
            case "secure":
            case "securecontext":
            case "issecurecontext": return window.isSecureContext
            default: return undefined
        }
    }
}

class TooltipElementExpression extends TooltipExpression {
    constructor(text, element) {
        super(text, element)
    }

    getValue() {
        let prop = this.text.substr(this.text.indexOf('.') + 1)
        
        if (prop.startsWith('data.')) return this.element.dataset[prop.substr(5)]
        if (prop.startsWith('style.')) return this.element.style[prop.substr(6)]
        if (prop.startsWith('parent.')) return new TooltipElementExpression(prop, this.element.parentElement).getValue()

        switch(prop) {
            case 'checked': return this.element.checked === true
            case 'value': return this.element.value
            default: return undefined
        }
    }
}

class Tooltip {
    static formatTooltipText(text, element) {
        return text.replace(Tooltip.formattingRegex, (str, p1, offset, s) => {
            return TooltipExpression.create(p1, element).getValue().toString().replace(/\\(.)/, '$1')
        })
    }

    static getTooltipText(element) {
        if (!element.dataset.tt) return null
        if (element.dataset.tt === "%inherit") {
            if (element.localName.toLowerCase() === "html") return null
            return Tooltip.getTooltipText(element.parentElement)
        }
        return Tooltip.formatTooltipText(element.dataset.tt, element)
    }

    static getTooltipStyle(element) {
        let style = element.dataset.tt_style
        if (!style) return null
        if (style === "%inherit") {
            if (element.localName.toLowerCase() === "html") return null
            style = Tooltip.getTooltipStyle(element.parentElement)
        }
        if (element.dataset.tt_format_style) return Tooltip.formatTooltipText(style, element)
        return style
    }

    static moveTooltip(x, y) {
        let translate = {x: 0, y: 0}
        let move = {x: 5, y: 5}

        if (x + 10 + Tooltip.tooltipElement.offsetWidth > window.innerWidth) {
            translate.x = -100
            move.x = -5
        }

        if (y + 10 + Tooltip.tooltipElement.offsetHeight > window.innerHeight) {
            translate.y = -100
            move.y = -5
        }

        Tooltip.tooltipElement.style.top = `${y + move.y}px`
        Tooltip.tooltipElement.style.left = `${x + move.x}px`
        Tooltip.tooltipElement.style.transform = `translate(${translate.x}%, ${translate.y}%)`
    }

    static updateTooltip(x, y, element) {
        //return
        let text = Tooltip.getTooltipText(element)
        if (text) {
            Tooltip.applyTooltipStyle(Tooltip.getTooltipStyle(element))
            Tooltip.tooltipElement.innerHTML = text
            Tooltip.tooltipElement.style.display = 'block'
            if (x >= 0 && y >= 0) Tooltip.moveTooltip(x, y)
            return
        }
        Tooltip.tooltipElement.style.display = 'none'
        Tooltip.tooltipElement.innerHTML = ""
    }

    static applyTooltipStyle(style) {
        if (!style) return document.getElementById('tooltip-style-helper').innerHTML = `#tooltip-div { }`
        document.getElementById('tooltip-style-helper').innerHTML = `#tooltip-div { ${style} }`
    }

    static tooltipElement = null
    static formattingRegex = /(?<!\\)D{(.*?)(?<!\\)}/g
    static formattingTernary = / *(.*?) *(?<!\\)\? *(.*?) *(?<!\\): *(.*) *?/
    static formattingComparison = / *(.*?) *(?<!\\)(<=|>=|<|>|===|!==|==|!=) *(.*) */
    static formattingOperation = / *(.*?) *(?<!\\)(\+|-|\*|\/|%|\^) *(.*) */
    static floatRegex = /-?\d+(\.\d+)?/
}


document.addEventListener('DOMContentLoaded', (e) => {
    let tooltipElement = document.createElement('div')
    tooltipElement.style.position = 'fixed'
    tooltipElement.style.display = 'none'
    tooltipElement.style.top = '0'
    tooltipElement.style.left = '0'
    tooltipElement.id = "tooltip-div"
    Tooltip.tooltipElement = tooltipElement
    document.querySelector('body').append(tooltipElement)
    document.querySelector('head').innerHTML += "<style id='tooltip-style-helper'></style>"

    document.addEventListener('mousemove', e=>{
        Tooltip.updateTooltip(e.clientX, e.clientY, e.target)
    }, {passive: true})
    document.addEventListener('click', e=>{
        Tooltip.updateTooltip(e.clientX, e.clientY, e.target)
    }, {passive: true})
    document.addEventListener('keydown', e=>{
        setTimeout(()=>{Tooltip.updateTooltip(-1, -1, e.target)},0)
    }, {passive: true})
})
