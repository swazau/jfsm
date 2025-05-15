/*! Modified JointJS UML Shapes for FSM Visualization */

// Create a custom transition shape that better handles labels
joint.shapes.uml.ImprovedTransition = joint.dia.Link.extend({
    defaults: joint.util.deepSupplement({
        type: 'uml.ImprovedTransition',
        attrs: {
            '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z', fill: '#34495e', stroke: '#2c3e50' },
            '.connection': { stroke: '#2c3e50', 'stroke-width': 2 },
            '.labels': { 'font-weight': 'bold' }
        },
        router: { name: 'normal' },
        connector: { name: 'rounded' },
        labels: [
            {
                position: 0.5,
                attrs: {
                    text: {
                        text: '', // Will be set programmatically
                        'font-family': 'Arial, sans-serif',
                        'font-size': 12,
                        'font-weight': 'bold',
                        'fill': 'black',
                        'text-anchor': 'middle',
                        'x-alignment': 'middle',
                        'y-alignment': 'middle'
                    },
                    rect: {
                        fill: 'white',
                        stroke: '#cccccc',
                        'stroke-width': 1,
                        rx: 5,
                        ry: 5,
                        width: 'auto',
                        height: 'auto'
                    }
                }
            }
        ]
    }, joint.dia.Link.prototype.defaults)
});

// Create a custom state shape with better label placement
joint.shapes.uml.ImprovedState = joint.shapes.uml.State.extend({
    defaults: joint.util.deepSupplement({
        attrs: {
            '.uml-state-body': {
                'width': 120, 'height': 60, 'rx': 10, 'ry': 10,
                'fill': '#ecf0f1', 'stroke': '#3498db', 'stroke-width': 2
            },
            '.uml-state-name': {
                'ref': '.uml-state-body', 'ref-x': .5, 'ref-y': .5, 'text-anchor': 'middle', 'y-alignment': 'middle',
                'fill': '#000000', 'font-family': 'Arial, sans-serif', 'font-size': 14, 'font-weight': 'bold'
            },
            '.uml-state-events': {
                'ref': '.uml-state-separator', 'ref-x': 5, 'ref-y': 5,
                'fill': '#000000', 'font-family': 'Arial, sans-serif', 'font-size': 12
            }
        }
    }, joint.shapes.uml.State.prototype.defaults)
});

// Override the existing Transition to use the improved one
joint.shapes.uml.Transition = joint.shapes.uml.ImprovedTransition;

// Create a custom paper view that handles label positioning better
joint.dia.PaperWithLabels = joint.dia.Paper.extend({
    initialize: function() {
        joint.dia.Paper.prototype.initialize.apply(this, arguments);
        
        this.on('cell:pointerdown', function(cellView, evt, x, y) {
            // Auto-adjust label positions when dragging cells
            if (cellView.model instanceof joint.dia.Link) {
                this.adjustLabelPositions(cellView.model);
            }
        }, this);
    },
    
    adjustLabelPositions: function(link) {
        // This method will be called when links are moved
        // It ensures labels don't overlap with the link path
        
        // For simplicity, we're just updating the position of the label
        // A more complex implementation would calculate the best position to avoid overlaps
        var labels = link.get('labels') || [];
        
        if (labels.length > 0) {
            var updatedLabels = labels.map(function(label) {
                // Add a small offset to the label position to avoid overlap
                var position = label.position;
                var offset = 10; // Pixels to offset
                
                // Clone the label and adjust its position
                var updatedLabel = _.clone(label);
                updatedLabel.position = position;
                
                // You could calculate a better position here
                // For example, by checking the link path and finding a non-overlapping spot
                
                return updatedLabel;
            });
            
            link.set('labels', updatedLabels, { silent: true });
        }
    }
});

// Extended StartState with better styling
joint.shapes.uml.ImprovedStartState = joint.shapes.uml.StartState.extend({
    defaults: joint.util.deepSupplement({
        attrs: { 
            circle: { 
                'fill': '#34495e', 
                'stroke': '#2c3e50', 
                'stroke-width': 2,
                'r': 15
            }
        },
        size: { width: 30, height: 30 }
    }, joint.shapes.uml.StartState.prototype.defaults)
});

// Extended EndState with better styling
joint.shapes.uml.ImprovedEndState = joint.shapes.uml.EndState.extend({
    defaults: joint.util.deepSupplement({
        size: { width: 30, height: 30 },
        attrs: {
            'circle.outer': {
                transform: 'translate(15, 15)',
                r: 15,
                fill: 'white',
                stroke: '#2c3e50',
                'stroke-width': 2
            },
            'circle.inner': {
                transform: 'translate(15, 15)',
                r: 10,
                fill: '#34495e'
            }
        }
    }, joint.shapes.uml.EndState.prototype.defaults)
});

// Override the existing shapes to use the improved ones
joint.shapes.uml.StartState = joint.shapes.uml.ImprovedStartState;
joint.shapes.uml.EndState = joint.shapes.uml.ImprovedEndState;

// Helper function to create a state machine diagram with non-overlapping labels
joint.shapes.uml.createStateMachineDiagram = function(graph, paper, stateMachine) {
    // Clear the graph
    graph.clear();
    
    var states = [];
    var stateMap = {};
    
    // Add start state
    var startState = new joint.shapes.uml.StartState({
        position: { x: 50, y: 180 },
        size: { width: 30, height: 30 }
    });
    states.push(startState);
    graph.addCell(startState);
    
    // Add states
    stateMachine.states.forEach(function(stateConfig) {
        var state = new joint.shapes.uml.State({
            position: stateConfig.position || { x: 100, y: 100 },
            size: stateConfig.size || { width: 120, height: 60 },
            name: stateConfig.name,
            events: stateConfig.events ? Object.keys(stateConfig.events).filter(e => stateConfig.events[e]) : []
        });
        states.push(state);
        stateMap[stateConfig.name] = state;
        graph.addCell(state);
    });
    
    // Add transition from start state to initial state
    var initialState = stateMap[stateMachine.initialState];
    if (initialState) {
        var initialTransition = new joint.shapes.uml.Transition({
            source: { id: startState.id },
            target: { id: initialState.id },
            smooth: true
        });
        graph.addCell(initialTransition);
    }
    
    // Add transitions
    stateMachine.transitions.forEach(function(transitionConfig) {
        var sourceState = stateMap[transitionConfig.from];
        
        // Create label
        var labelText = transitionConfig.trigger;
        if (transitionConfig.output) {
            labelText += " / " + transitionConfig.output;
        }
        if (transitionConfig.guard) {
            labelText += " [" + transitionConfig.guard + "]";
        }
        
        // Handle simple transitions
        if (typeof transitionConfig.to === 'string') {
            var targetState = stateMap[transitionConfig.to];
            if (sourceState && targetState) {
                var transition = new joint.shapes.uml.Transition({
                    source: { id: sourceState.id },
                    target: { id: targetState.id },
                    smooth: true,
                    router: { name: 'manhattan' },
                    connector: { name: 'rounded' },
                    labels: [{ position: 0.5, attrs: { text: { text: labelText } } }]
                });
                
                // Add vertices for custom routing if specified
                if (transitionConfig.vertices && transitionConfig.vertices.length > 0) {
                    transition.set('vertices', transitionConfig.vertices);
                }
                
                graph.addCell(transition);
            }
        } 
        // Handle transitions with guards and multiple destinations
        else if (typeof transitionConfig.to === 'object') {
            var trueState = stateMap[transitionConfig.to.onTrue];
            var falseState = stateMap[transitionConfig.to.onFalse];
            
            if (sourceState && trueState) {
                var trueTransition = new joint.shapes.uml.Transition({
                    source: { id: sourceState.id },
                    target: { id: trueState.id },
                    smooth: true,
                    router: { name: 'manhattan' },
                    connector: { name: 'rounded' },
                    labels: [{ position: 0.5, attrs: { text: { text: labelText + " (true)" } } }]
                });
                
                if (transitionConfig.vertices && transitionConfig.vertices.length > 0) {
                    trueTransition.set('vertices', transitionConfig.vertices);
                }
                
                graph.addCell(trueTransition);
            }
            
            if (sourceState && falseState) {
                // Create a slightly different path for the false transition
                var falseVertices = [];
                if (transitionConfig.vertices && transitionConfig.vertices.length > 0) {
                    // Clone and modify vertices
                    falseVertices = JSON.parse(JSON.stringify(transitionConfig.vertices));
                    falseVertices.forEach(function(v) {
                        v.y += 20; // Offset to separate from true path
                    });
                }
                
                var falseTransition = new joint.shapes.uml.Transition({
                    source: { id: sourceState.id },
                    target: { id: falseState.id },
                    smooth: true,
                    router: { name: 'manhattan' },
                    connector: { name: 'rounded' },
                    labels: [{ position: 0.5, attrs: { text: { text: labelText + " (false)" } } }]
                });
                
                if (falseVertices.length > 0) {
                    falseTransition.set('vertices', falseVertices);
                }
                
                graph.addCell(falseTransition);
            }
        }
    });
    
    return { states: states, stateMap: stateMap };
};