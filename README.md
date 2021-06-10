# Tooltip.js
A JavaScript library for creating dynamic tooltips with custom styles

you can see a basic example [here](https://leotomasmc.github.io/Tooltip.js/example.html)

## How to use
First, add the script tag to add the library.
```html
<script src="./tooltip.js"></script>
```
Then add a basic style to your stylesheet or style tag
```css
#tooltip-div {
    background-color: #33333399;
    pointer-events: none;
    height: 3em;
    width: 10em;
}
```
You can change it however you would like, but this is just an example.

To add tooltips to an element, add a `data-tt` attribute to the element you want to have the tooltip with the string you want displayed.
```html
<p data-tt="span tooltip!">this text has a tooltip</p>
```
If you want an element to inherit its parent's tooltip, set the string in the tooltip to `%inherit`.

If you want a specific element to use a modified style, you can add a `data-tt_style` attribute.
```html
<p data-tt='his text should be red' data-tt_style="color: #f00">this text has a tooltip with colored text</p>
```

## Tooltip Expressions
Tooltips can include expressions to add dynamic content based on things in the document. To define an expression, you use the syntax `D{<expr>}` inside your tooltip. The entire thing will be replaced with the value of the expression. These expressions are not JavaScript, and instead use a custom parser. Here is an example to make a checkbox with different text when it is checked or unchecked:
```html
<input type='checkbox' data-tt="this checkbox is D{el.checked ? 'checked' : 'not checked'}">
```
The `this checkbox is ` text before the expression will remain constant, but the expression (`D{el.checked ? 'checked' : 'not checked'}`) will change. A quick explanation of this example: The expression as a whole is a ternary expression, and works pretty much the same as the JavaScript ternary operator (`condition ? value if true : value if false`). The 2 values are just strings defined using single quotes (`'`), but you can use also use double quotes (`"`) or backticks (`` ` ``) to denote strings. The condition of `el.checked` means to look at the `checked` property of `el`, which is the current target element.

# Expression documentation
this documentation will probably not be updated very frequently, but as of inital release should cover almost everything. Also this documents some internal features as well as syntax, so it might be confusing

## TooltipExpression
The base for all expressions
- `getAsConst()` - tries to convert this object from a string into the primitave it might represent. Can currently remove quotes from strings (eg `"'hi'" -> "hi"`), convert to Number (float and negatives should work), and convert to boolean. (the name is bad, idk why i choose it)
- `getValue()` - Returns the value of the expression. Will calculate sub-expressions if needed. On the base `TooltipExpression`, just returns `this.getAsConst()`.
- `static create(text, el)` - Creates and returns a new expression. Will attempt to automatically find the correct type to use.

## TooltipTernaryExpression
The class that evaluates ternary expressions
- `getValue()` - Returns the result of the ternary operator. (simply returns `this.isTruthy() ? this.getTruthy() : this.getFalsy()`)
- `isTruthy()` - Returns if the value of the condition sub-expression (the first segment, before the `?`) is truthy or not.
- `getTruthy()` - Returns the value of the truthy sub-expression (the middle segment, between the `?` and the `:`)
- `getFalsy()` - Returns the value of the falsy sub-expression (the last segment, after the `:`)

## TooltipSidedExpression
A base class shared by `TooltipComparisonExpression` and `TooltipOperationExpression`
- `getLeftValue()` - Returns the value of the expression on the left-hand side of the operator
- `getRightValue()` - Returns the value of the expression on the right-hand side of the operator
- `operator` - Stores the string representation of the operator

## TooltipComparisonExpression
The class that handles comparison expressions, such as `==`, `<`, and others
- `getValue()` - Returns a boolean of if the comparison is true

## TooltipOperationExpression
The class that handles operation expressions.
- `getValue()` - Returns the result of applying the right-hand side expression to the left-hand side expression with the given operator

## TooltipNavigatorExpression
handles expressions that get values from `window.navigator`
currently supports:
- `useragent`
- `issecurecontext`

## TooltipElementExpression
handles expressions that get attributes from DOM elements.
Currently supports accessing the following properties of an element:
- `data` - accesses `element.dataset`
- `style`
- `parent` - accesses `element.parentElement`
- `checked`
- `value`
