/*
The MIT License (MIT)

Copyright (c) 2014 The Australian National University

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

var React = require('react');

var ou = require('plexus-objective');

var $ = React.DOM;


var normalizer = {};


normalizer.string = function(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^ /, '')
    .replace(/\u00ad/g, '');
};

normalizer.integer = function(text) {
  return text
    .replace(/[^-\d]/g, '')
    .replace(/(.)-/g, '$1');
};

normalizer.number = function(text) {
  return text
    .replace(/[^-\.e\d]/ig, '')
    .replace(/(e[^e]*)e/ig, '$1')
    .replace(/([e.][^.]*)\./ig, '$1')
    .replace(/([^e])-/ig, '$1')
    .replace(/(e-?\d\d\d)\d/ig, '$1');
};


var parser = {};

parser.string = function(text) {
  return normalizer.string(text);
};

parser.integer = function(text) {
  return text ? parseInt(normalizer.integer(text)) : null;
};

parser.number = function(text) {
  return text ? parseFloat(normalizer.number(text)) : null;
};


var errorClass = function(errors) {
  return (errors == null || errors.length == 0) ? '' : 'error';
};


var makeTitle = function(description, errors) {
  var parts = [];
  if (description != null && description.length > 0)
    parts.push(description);
  if (errors != null && errors.length > 0)
    parts.push(errors.join('\n'));
  return parts.join('\n\n');
};


var wrappedField = function(props, field) {
  var extra = ou.getIn(props.schema, ['x-hints', 'form', 'classes']);
  var title = makeTitle(props.schema.description, props.errors);

  var help = (props.showHelp
              ? props.showHelp({ path: props.path })
              : null);

  var error = (props.showError
               ? props.showError({ path     : props.path,
                                   value    : props.getValue(props.path),
                                   errors   : props.errors })
               : null);

  var classes = [].concat(errorClass(props.errors) || [],
                          'form-element',
                          extra || []);

  return $.div({ className: classes.join(' '),
                 title    : title },
               $.label({ "htmlFor": props.key },
                       props.schema.title),
               error,
               field,
               help);
};


var InputField = React.createClass({
  displayName: 'InputField',

  normalize: function(text) {
    return normalizer[this.props.type](text);
  },
  parse: function(text) {
    return parser[this.props.type](text);
  },
  handleChange: function(event) {
    var text = this.normalize(event.target.value);
    this.props.update(this.props.path, text, this.parse(text));
  },
  handleKeyPress: function(event) {
    if (event.keyCode == 13)
      event.preventDefault();
  },
  render: function() {
    var field = $.input({
      type      : "text",
      name      : this.props.key,
      value     : this.props.value,
      onKeyPress: this.handleKeyPress,
      onChange  : this.handleChange });

    return wrappedField(this.props, field);
  }
});


var CheckBox = React.createClass({
  displayName: 'CheckBox',

  handleChange: function(event) {
    var val = event.target.checked;
    this.props.update(this.props.path, val, val);
  },
  render: function() {
    var field = $.input({
      name: this.props.key,
      type: "checkbox",
      checked: this.props.value,
      onChange: this.handleChange });

    return wrappedField(this.props, field);
  }
});


var Selection = React.createClass({
  displayName: 'Selection',

  handleChange: function(event) {
    var val = event.target.value;
    this.props.update(this.props.path, val, val);
  },
  render: function() {
    var field = $.select({ name: this.props.key,
                           value: this.props.selected,
                           onChange: this.handleChange },
                         this.props.options.map(function(opt) {
                           return $.option({ key: opt, value: opt }, opt);
                         }));

    return wrappedField(this.props, field);
  }
});


var FileField = React.createClass({
  displayName: 'FileField',

  loadFile: function(event) {
    var reader = new FileReader();
    var file = event.target.files[0];
    var val = ou.merge(this.props.getValue(this.props.path), {
      name: file.name,
      type: file.type,
      size: file.size
    });

    this.props.update(this.props.path, val, val);

    reader.onload = function(event) {
      val.data = event.target.result;
      this.props.update(this.props.path, val, val);
    }.bind(this);

    if (file) {
      if (this.props.mode == 'dataURL')
        reader.readAsDataURL(file);
      else
        reader.readAsText(file);
    }
  },
  render: function() {
    var props = this.props;
    var list = [
      $.dl({ key: "fileProperties" },
           $.dt(null, "Name"), $.dd(null, props.value.name || '-'),
           $.dt(null, "Size"), $.dd(null, props.value.size || '-'),
           $.dt(null, "Type"), $.dd(null, props.value.type || '-')),
      $.input({ key: "input", type: "file", onChange: this.loadFile })
    ];

    return makeFieldset(props, list.concat(fieldsForObject(props)));
  }
});


var makeKey = function(path) {
  return path.join('_');
};


var fieldsForObject = function(props) {
  return Object.keys(props.schema.properties || {}).map(function(key) {
    return makeFields(ou.merge(props, {
      schema: props.schema.properties[key],
      path  : props.path.concat(key)
    }));
  });
};


var fieldsForArray = function(props) {
  var n = (props.getValue(props.path) || []).length + 1;
  var list = [];
  for (var i = 0; i < n; ++i) {
    list.push(makeFields(ou.merge(props, {
      schema: props.schema.items,
      path  : props.path.concat(i),
    })));
  }

  return list;
};


var schemaForAlternative = function(value, schema) {
  var selector, options, selected;

  selector = ou.getIn(schema, ['x-hints', 'form', 'selector']);
  if (!selector)
    return;

  options = schema.oneOf.map(function(alt) {
    return ou.getIn(alt, [ 'properties', selector, 'enum', 0 ]) || "";
  });

  selected = (value || {})[selector] || options[0];

  return ou.merge(ou.setIn(schema.oneOf[options.indexOf(selected)],
                           [ 'properties', selector ],
                           ou.merge(ou.getIn(schema, [ 'properties', selector]),
                                    { enum: options })),
                  { type: 'object' });
};


var fieldsForAlternative = function(props) {
  var schema = schemaForAlternative(props.getValue(props.path), props.schema);

  return fieldsForObject(ou.merge(props, { schema: schema }));
};


var makeFieldset = function(props, fields) {
  var extra = ou.getIn(props.schema, ['x-hints', 'form', 'classes']);
  var errors = props.getErrors(props.path);
  var legendClasses = [].concat('form-section-title',
                                errorClass(errors) || []);
  var title = makeTitle(props.schema.description, errors);
  var headProps = ou.merge(props, {
    className: legendClasses.join(' '),
    title    : title
  });

  var classes = [].concat('form-section',
                          (props.path.length > 0 ? 'form-subsection' : []),
                          extra || []);


  return $.fieldset({ className: classes.join(' '),
                      key: makeKey(props.path) },
                    $.legend(headProps, props.schema.title),
                    fields);
};


var makeFields = function(props) {
  var hints = ou.getIn(props, ['schema', 'x-hints']) || {};

  if (hints.fileUpload) {
    return FileField(ou.merge(props, {
      key   : makeKey(props.path),
      value : props.getValue(props.path) || {},
      mode  : hints.fileUpload.mode,
      errors: props.getErrors(props.path)
    }));
  }

  if (props.schema['oneOf'])
    return makeFieldset(props, fieldsForAlternative(props));

  if (props.schema['enum']) {
    return Selection(ou.merge(props, {
      key     : makeKey(props.path),
      options : props.schema['enum'],
      selected: props.getValue(props.path) || props.schema['enum'][0],
      errors  : props.getErrors(props.path)
    }));
  }

  switch (props.schema.type) {
  case "boolean":
    return CheckBox(ou.merge(props, {
      key   : makeKey(props.path),
      value : props.getValue(props.path) || false,
      errors: props.getErrors(props.path)
    }));
  case "object" :
    return makeFieldset(props, fieldsForObject(props));
  case "array"  :
    return makeFieldset(props, fieldsForArray(props));
  case "number" :
  case "integer":
  case "string" :
  default:
    return InputField(ou.merge(props, {
      key   : makeKey(props.path),
      value : props.getValue(props.path) || '',
      errors: props.getErrors(props.path),
      type  : props.schema.type
    }));
  }
};


var withDefaultOptions = function(data, schema) {
  var result;
  var key;

  if (schema['enum']) {
    result = data || schema['enum'][0];
  } else if (schema.oneOf) {
    result = withDefaultOptions(data, schemaForAlternative(data, schema));
  } else if (schema.type == 'object') {
    result = {};
    for (key in schema.properties)
      result[key] = withDefaultOptions((data || {})[key],
                                       schema.properties[key]);
  } else if (schema.type == 'array') {
    result = [];
    for (key = 0; key < (data || []).length; ++key)
      result[key] = withDefaultOptions((data || [])[key],
                                       schema.items);
  } else {
    result = data;
  }
  return result;
};


var hashedErrors = function(errors) {
  var result = {};
  var i, entry;
  for (i = 0; i < errors.length; ++i) {
    entry = errors[i];
    result[makeKey(entry.path)] = entry.errors;
  }
  return result;
};


var normalise = function(data, schema) {
  return ou.prune(withDefaultOptions(data, schema));
};


var Form = React.createClass({
  displayName: 'Form',

  getInitialState: function() {
    var errors =
      hashedErrors(this.props.validate(this.props.schema, this.props.values));
    return { values: this.props.values,
             output: this.props.values,
             errors: errors };
  },
  componentWillReceiveProps: function(props) {
    var values = props.values || this.state.values;
    var output = props.values || this.state.output;
    this.setState({
      values: values,
      output: output,
      errors: hashedErrors(this.props.validate(props.schema, output))
    });
  },
  setValue: function(path, raw, parsed) {
    var schema = this.props.schema;
    var values = normalise(ou.setIn(this.state.values, path, raw), schema);
    var output = normalise(ou.setIn(this.state.output, path, parsed), schema);
    var errors = hashedErrors(this.props.validate(schema, output));

    if (this.props.submitOnChange)
      this.props.onSubmit(output, null, errors);
    else
      this.setState({
        values: values,
        output: output,
        errors: errors
      });
  },
  getValue: function(path) {
    return ou.getIn(this.state.values, path);
  },
  getErrors: function(path) {
    return this.state.errors[makeKey(path)];
  },
  preventSubmit: function(event) {
    event.preventDefault();
  },
  handleSubmit: function(event) {
    this.props.onSubmit(this.state.output,
                        event.target.value,
                        this.state.errors);
  },
  handleKeyPress: function(event) {
    if (event.keyCode == 13 && this.props.enterKeySubmits)
      this.props.onSubmit(this.state.output, this.props.enterKeySubmits);
  },
  render: function() {
    var schema = this.props.schema;
    var fields = makeFields({
      schema   : this.props.schema,
      showHelp : this.props.showHelp,
      showError: this.props.showError,
      hints    : this.props.hints,
      path     : [],
      update   : this.setValue,
      getValue : this.getValue,
      getErrors: this.getErrors
    });

    var submit = this.handleSubmit;
    var buttonValues = this.props.buttons;

    var buttons = function() {
      return $.p(null,
                 (buttonValues || ['Cancel', 'Submit']).map(function(value) {
                   return $.input({ type   : 'submit',
                                    key    : value,
                                    value  : value,
                                    onClick: submit })
                 }));
    };

    return $.form({ onSubmit: this.preventSubmit,
                    onKeyPress: this.handleKeyPress
                  },
                  this.props.extraButtons ? buttons() : $.span(),
                  fields,
                  buttons());
  }
});

module.exports = Form;
