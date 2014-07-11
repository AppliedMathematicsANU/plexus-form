'use strict';

var React = require('react');

var validate = require('plexus-validate');
var Form     = require('../index');

window.React = React;


var schema = {
  title: "Example form",
  description: "A form based on a schema",
  type: "object",
  required: ["name", "age"],
  properties: {
    name: {
      title: "Your name",
      description: "Your full name",
      type: "string",
      minLength: 3,
      maxLength: 40,
      pattern: "^[A-Z][a-z]*(\\s[A-Z][a-z]*)*$",
      'x-hints': {
        form: {
          classes: 'important-field'
        }
      }
    },
    age: {
      title: "Your age",
      type: "integer",
      minimum: 1
    },
    weight: {
      title: "Your weight in kg",
      type: "number",
      minimum: 0,
      exclusiveMinimum: true
    },
    color: {
      title: "Favourite colour",
      type: "object",
      properties: {
        hasFave: {
          title: "Do you have a favourite colour?",
          type: "string"
        }
      },
      oneOf: [
        {
        },
        {
          properties: {
            hasFave: {
              enum: [ "no" ]
            }
          }
        },
        {
          properties: {
            hasFave: {
              enum: [ "yes" ]
            },
            fave: {
              title: "Your favourite colour",
              type: "string",
              enum: [
                "", "red", "green", "blue", "yellow", "orange", "purple", "other"
              ]
            }
          }
        }
      ],
      "x-hints": {
        form: {
          selector: "hasFave",
        }
      }
    },
    interests: {
      title: "Your interests",
      type: "array",
      minItems: 2,
      items: {
        type: "string",
        minLength: 2
      }
    },
    languages: {
      title: "Languages you speak",
      type: "array",
      maxItems: 2,
      items: {
        type: "string"
      }
    },
    motto: {
      title: "Your motto (file upload)",
      type: "object",
      "x-hints": {
        "fileUpload": {
          "mode": "text"
        },
        "form": {
          classes: "important-file"
        }
      },
      properties: {
        caption: {
          title: "Caption",
          type: "string"
        }
      }
    }
  }
};


var SchemaEditor = React.createClass({
  displayName: 'SchemaEditor',

  preventSubmit: function(event) {
    event.preventDefault();
  },
  render: function() {
    return (
      <form onSubmit={this.preventSubmit}>
        <textarea rows="30" cols="60" onChange={this.props.onChange} value={this.props.value}></textarea>
      </form>
    );
  }
});


var Help = React.createClass({
  render: function() {
    return (
        <span className='form-help' title={this.props.path}>
        ?
        </span>
    );
  }
});


var Error = React.createClass({
  render: function() {
    var errors = (this.props.errors || []).join(',');
    var classes = 'form-error' + (errors ? '' : ' invisible');

    return (
        <span className={classes} title={errors}>
        !
        </span>
    );
  }
});


var FormDemoPage = React.createClass({
  displayName: 'FormDemoPage',

  getInitialState: function() {
    return {
      schema: schema,
      text  : JSON.stringify(schema, null, 2)
    };
  },
  update: function(event) {
    var text = event.target.value;
    var schema;
    try {
      schema = JSON.parse(event.target.value);
      this.setState({ schema: schema, text: text });
    } catch (ex) {
      this.setState({ text: text });
    }
  },
  onFormSubmit: function(data, value, errors) {
    this.setState({ button: value, data: data, errors: errors });
  },
  render: function() {
    return (
      <div>
        <ul className="flexContainer">
          <li className="flexItem">
            <h3>Schema:</h3>
            <SchemaEditor value={this.state.text} onChange={this.update} />
          </li>
          <li className="flexItem">
            <h3>Generated form:</h3>
            <Form buttons={['Dismissed', 'Energise']}
              onSubmit={this.onFormSubmit}
              schema={this.state.schema}
              validate={validate}
              showHelp={Help}
              showError={Error}
            />
          </li>
          <li className="flexItem">
            <h3>Data:</h3>
            <pre>{JSON.stringify(this.state.data, null, 4)}</pre>

            <h3>Button:</h3>
            <p>{this.state.button}</p>

            <h3>Errors:</h3>
            <pre>{JSON.stringify(this.state.errors, null, 4)}</pre>
          </li>
        </ul>
      </div>
    );
  }
});


React.renderComponent(FormDemoPage(), document.getElementById('react-main'));
