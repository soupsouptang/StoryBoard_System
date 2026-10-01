const assert = require('node:assert/strict');
const React = require('react');
const Choice = require('../dist/components/select.js');
const { Select } = require('../dist/primitives.js');

function descendants(element) {
  if (!React.isValidElement(element)) return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(descendants)];
}

let changed;
const options = [
  { value: '', label: 'Empty' },
  { value: '__frameforge_empty_option__', label: 'Real domain value' },
  { value: '__frameforge_empty_option___', label: 'Second collision', disabled: true }
];
const root = Select({ label: 'Test', value: '', name: 'choice', required: true, options, onChange: value => { changed = value; } });
const elements = descendants(root);
const items = elements.filter(element => element.type === Choice.SelectItem);

assert.equal(root.props.value, ''); // Keep Radix clearing, required and form serialization semantics.
assert.equal(root.props.name, 'choice');
assert.equal(root.props.required, true);
assert.equal(elements.find(element => element.type === Choice.SelectValue).props.placeholder, 'Empty');
assert(items.every(item => item.props.value !== ''));
assert.equal(new Set(items.map(item => item.props.value)).size, 3);
root.props.onValueChange(items[0].props.value);
assert.equal(changed, '');
root.props.onValueChange(options[1].value);
assert.equal(changed, options[1].value);
assert.equal(items[2].props.disabled, true);
const content = descendants(Choice.SelectContent.render({ children: null }, null));
assert(content.some(element => element.type === Choice.SelectScrollUpButton));
assert(content.some(element => element.type === Choice.SelectScrollDownButton));
console.log('Select adapter: empty option, collisions, form value and scrolling passed');
