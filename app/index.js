var gui = require('nw.gui');
var fs = require('fs');
var path = require('path');

// Try to load helpers from correct location
var helpers;
try {
    helpers = require('../src/fsm-helpers');
} catch (e) {
    try {
        helpers = require('../lib/fsm-helpers');
    } catch (e2) {
        console.error("Could not load fsm-helpers", e2);
        helpers = {
            arrayGetNamed: function(array, name) {
                for (var i = 0; i < array.length; i++) {
                    if (array[i].name === name) {
                        return array[i];
                    }
                }
                return null;
            }
        };
    }
}

var graph = new joint.dia.Graph;
var uml = joint.shapes.uml;
var win = gui.Window.get();

// Set up window
win.isKioskMode = false;
win.setResizable(true);

// Create paper object
var paper = new joint.dia.Paper({
    el: $('#paper'),
    width: $(document).width(),
    height: $(document).height(),
    gridSize: 10,
    model: graph,
    defaultLink: new uml.Transition(),
    defaultConnectionPoint: { name: 'boundary' }
});

// Try to load PushdownAutomaton.json first, fallback to UMLStateMachine.json
var stateMachineFile = "./PushdownAutomaton.json";
if (!fs.existsSync(stateMachineFile)) {
    stateMachineFile = "./UMLStateMachine.json";
}

console.log("Loading state machine from:", stateMachineFile);
var file = fs.readFileSync(stateMachineFile);
var sm = JSON.parse(file);

var states = [];

// Render start state
states.push(new uml.StartState({
    position: { x: 20, y: 180 },
    size: { width: 30, height: 30 },
}));

// Render states
sm.states.forEach(function(state, index) {
    var newState = new uml.State({
        position: state.position || { x: 100 + index * 180, y: 100 },
        size: state.size || { width: 120, height: 60 },
        name: state.name,
        events: state.events ? Object.keys(state.events).filter(key => state.events[key]) : []
    });

    // Attach id for later traversal
    state.id = newState.id;
    states.push(newState);
});

graph.addCells(states);

var transitions = [];

// Add transition from start state to initial state
transitions.push(new uml.Transition({
    source: { id: states[0].id },
    target: { id: helpers.arrayGetNamed(sm.states, sm.initialState).id },
    smooth: true
}));

// Add transitions between states
sm.transitions.forEach(function(transition, index) {
    console.log("Transition: " + transition.from + "->" + transition.to);
    
    var from = helpers.arrayGetNamed(sm.states, transition.from);
    
    if (!from) {
        console.error("Could not find source state:", transition.from);
        return;
    }

    // Create the label for the transition
    var labelText = transition.trigger;
    if (transition.output) {
        labelText += " / " + transition.output;
    }
    if (transition.guard) {
        labelText += " [" + transition.guard + "]";
    }

    if (typeof transition.guard === 'undefined' || typeof transition.to === 'string') {
        // Single destination
        var toName = typeof transition.to === 'string' ? transition.to : transition.to;
        var to = helpers.arrayGetNamed(sm.states, toName);
        
        if (!to) {
            console.error("Could not find target state:", toName);
            return;
        }

        var newTransition = new uml.Transition({
            source: { id: from.id },
            target: { id: to.id },
            smooth: true,
            labels: [{ position: 0.5, attrs: { text: { text: labelText } } }]
        });

        // Add vertices for curved paths if specified
        if (transition.vertices && transition.vertices.length > 0) {
            newTransition.set('vertices', transition.vertices);
        }

        // Attach id for later traversal
        transition.id = newTransition.id;
        transitions.push(newTransition);
    } else {
        // Handle transitions with guards and multiple destinations
        console.log("Guard condition:", transition.guard);
        
        // Handle the true case
        if (transition.to.onTrue) {
            var toTrue = helpers.arrayGetNamed(sm.states, transition.to.onTrue);
            
            if (toTrue) {
                var trueLabelText = labelText + " (true)";
                var trueTransition = new uml.Transition({
                    source: { id: from.id },
                    target: { id: toTrue.id },
                    smooth: true,
                    labels: [{ position: 0.5, attrs: { text: { text: trueLabelText } } }]
                });
                
                if (transition.vertices && transition.vertices.length > 0) {
                    trueTransition.set('vertices', transition.vertices);
                }
                
                transitions.push(trueTransition);
            }
        }
        
        // Handle the false case
        if (transition.to.onFalse) {
            var toFalse = helpers.arrayGetNamed(sm.states, transition.to.onFalse);
            
            if (toFalse) {
                var falseLabelText = labelText + " (false)";
                
                // Modify vertices for false path to separate from true path
                var falseVertices = [];
                if (transition.vertices && transition.vertices.length > 0) {
                    falseVertices = JSON.parse(JSON.stringify(transition.vertices));
                    // Offset the vertices slightly
                    falseVertices.forEach(function(vertex) {
                        vertex.y += 30; // Adjust as needed
                    });
                }
                
                var falseTransition = new uml.Transition({
                    source: { id: from.id },
                    target: { id: toFalse.id },
                    smooth: true,
                    labels: [{ position: 0.5, attrs: { text: { text: falseLabelText } } }]
                });
                
                if (falseVertices.length > 0) {
                    falseTransition.set('vertices', falseVertices);
                }
                
                transitions.push(falseTransition);
            }
        }
    }
});

graph.addCells(transitions);

// Add zoom functionality
var currentScale = 1;

document.addEventListener('keydown', function(e) {
    // Zoom in: Ctrl + +
    if (e.ctrlKey && e.key === '+') {
        currentScale += 0.1;
        paper.scale(currentScale, currentScale);
        e.preventDefault();
    }
    // Zoom out: Ctrl + -
    else if (e.ctrlKey && e.key === '-') {
        currentScale = Math.max(0.2, currentScale - 0.1);
        paper.scale(currentScale, currentScale);
        e.preventDefault();
    }
});