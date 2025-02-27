import { useHistory } from '../composables/useHistory.js';

export default {
  name: 'GraphSummarizer',
  template: `
    <div class="h-full flex flex-col overflow-hidden p-4">
      <h3 class="text-lg font-semibold text-green-400 mb-4">
        Relationship Graph
        <button class="ml-2 px-2 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600" @click="extractRelationships">
          <i class="pi pi-refresh"></i> Extract
        </button>
      </h3>
      <div class="flex mb-2 text-xs">
        <button class="px-2 py-1 bg-gray-700 rounded-l hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'force' }" @click="setLayout('force')">Force</button>
        <button class="px-2 py-1 bg-gray-700 hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'radial' }" @click="setLayout('radial')">Radial</button>
        <button class="px-2 py-1 bg-gray-700 rounded-r hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'tree' }" @click="setLayout('tree')">Tree</button>
      </div>
      <div ref="graphContainer" class="flex-1 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden"></div>
      <div class="mt-2 text-gray-400 text-sm">
        <div v-if="nodes.length === 0">No relationships extracted yet. Click 'Extract' to analyze documents.</div>
        <div v-else>Found {{ nodes.length }} entities and {{ links.length }} relationships.</div>
      </div>
    </div>
  `,
  setup() {
    const { gatherLocalHistory } = useHistory();
    const graphContainer = Vue.ref(null);
    const nodes = Vue.ref([]);
    const links = Vue.ref([]);
    const currentLayout = Vue.ref('force');
    let simulation = null;
    let svg = null;
    let width = 0;
    let height = 0;
    
    // Initialize D3 visualization
    function initGraph() {
      if (!graphContainer.value) return;
      
      // Clear previous graph
      if (svg) {
        d3.select(graphContainer.value).select("svg").remove();
      }
      
      // Get container dimensions
      const rect = graphContainer.value.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      
      // Create SVG
      svg = d3.select(graphContainer.value)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);
        
      // Add zoom behavior
      svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        }));
      
      // Create main group for graph
      const g = svg.append("g");
      
      // Create links
      const link = g.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links.value)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));
      
      // Create node tooltips
      const tooltip = d3.select(graphContainer.value)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#222")
        .style("color", "white")
        .style("border", "1px solid #333")
        .style("border-radius", "4px")
        .style("padding", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);
      
      // Create nodes
      const node = g.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes.value)
        .join("circle")
        .attr("r", d => Math.max(5, 3 + d.connections))
        .attr("fill", d => typeToColor(d.type))
        .on("mouseover", (event, d) => {
          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
          tooltip.html(`<strong>${d.name}</strong><br/>Type: ${d.type}<br/>Links: ${d.connections}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        })
        .call(drag(simulation));
      
      // Create text labels
      const labels = g.append("g")
        .selectAll("text")
        .data(nodes.value)
        .join("text")
        .text(d => d.name)
        .attr("font-size", "8px")
        .attr("dx", 8)
        .attr("dy", ".35em")
        .attr("fill", "white");
      
      // Create link labels
      const linkLabels = g.append("g")
        .selectAll("text")
        .data(links.value)
        .join("text")
        .text(d => d.type)
        .attr("font-size", "7px")
        .attr("fill", "lightgray")
        .attr("text-anchor", "middle");
      
      if (currentLayout.value === 'force') {
        applyForceLayout(node, link, labels, linkLabels);
      } else if (currentLayout.value === 'radial') {
        applyRadialLayout(node, link, labels, linkLabels);
      } else if (currentLayout.value === 'tree') {
        applyTreeLayout(node, link, labels, linkLabels);
      }
    }
    
    // Apply force-directed layout
    function applyForceLayout(node, link, labels, linkLabels) {
      simulation = d3.forceSimulation(nodes.value)
        .force("link", d3.forceLink(links.value).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", () => {
          link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
            
          node
            .attr("cx", d => d.x = Math.max(10, Math.min(width - 10, d.x)))
            .attr("cy", d => d.y = Math.max(10, Math.min(height - 10, d.y)));
            
          labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);
            
          linkLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);
        });
        
      // Drag behavior for nodes
      node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    }
    
    // Apply radial layout
    function applyRadialLayout(node, link, labels, linkLabels) {
      // Use a radial layout for nodes
      const radius = Math.min(width, height) / 2 - 40;
      const angle = d3.scaleLinear()
        .domain([0, nodes.value.length])
        .range([0, 2 * Math.PI]);
        
      nodes.value.forEach((d, i) => {
        d.x = width / 2 + radius * Math.cos(angle(i));
        d.y = height / 2 + radius * Math.sin(angle(i));
      });
      
      // Update node positions
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
        
      // Update link positions
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
      // Update label positions
      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
        
      // Update link label positions
      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
    }
    
    // Apply tree layout
    function applyTreeLayout(node, link, labels, linkLabels) {
      // Find a root node (if we don't have a clear root, use the first node)
      const rootNodeId = nodes.value.length > 0 ? nodes.value[0].id : null;
      
      if (!rootNodeId) return;
      
      // Create a hierarchical structure
      const hierarchy = createHierarchy(rootNodeId);
      
      // Create tree layout
      const treeLayout = d3.tree()
        .size([width - 100, height - 100]);
        
      // Apply layout to hierarchy
      const root = treeLayout(hierarchy);
      
      // Update node positions based on tree layout
      root.descendants().forEach(d => {
        const node = nodes.value.find(n => n.id === d.data.id);
        if (node) {
          node.x = d.x + 50;
          node.y = d.y + 50;
        }
      });
      
      // Update visual elements
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
        
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
        
      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
    }
    
    // Create hierarchy for tree layout
    function createHierarchy(rootId) {
      // Find all children of the root
      const children = links.value
        .filter(link => link.source.id === rootId)
        .map(link => link.target.id);
        
      // Create hierarchical data
      const createNode = (id) => {
        const children = links.value
          .filter(link => link.source.id === id)
          .map(link => createNode(link.target.id));
          
        return {
          id: id,
          children: children.length > 0 ? children : null
        };
      };
      
      return d3.hierarchy(createNode(rootId));
    }
    
    // Helper function to map node type to color
    function typeToColor(type) {
      const colorMap = {
        'person': '#4285F4',
        'organization': '#EA4335',
        'location': '#FBBC05',
        'concept': '#34A853',
        'event': '#FF6D01',
        'time': '#46BDC6',
        'document': '#7742F6'
      };
      
      return colorMap[type?.toLowerCase()] || '#777777';
    }
    
    // Drag functions for nodes
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // Create drag behavior
    function drag(simulation) {
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
        
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    }
    
    // Set the current layout and reinitialize the graph
    function setLayout(layout) {
      currentLayout.value = layout;
      initGraph();
    }
    
    // Extract relationships from documents
    function extractRelationships() {
      const history = gatherLocalHistory();
      const documents = history.documents || [];
      const artifacts = history.artifacts || [];
      const transcripts = history.transcripts || [];
      
      // Reset graph data
      nodes.value = [];
      links.value = [];
      
      // Helper to add a node if it doesn't already exist
      const addNodeIfNotExists = (id, name, type) => {
        if (!nodes.value.some(n => n.id === id)) {
          nodes.value.push({
            id,
            name,
            type,
            connections: 0
          });
        }
      };
      
      // Helper to add a link between nodes
      const addLink = (sourceId, targetId, type, value = 1) => {
        // Increase connections counter
        const sourceNode = nodes.value.find(n => n.id === sourceId);
        const targetNode = nodes.value.find(n => n.id === targetId);
        
        if (sourceNode) sourceNode.connections++;
        if (targetNode) targetNode.connections++;
        
        links.value.push({
          source: sourceId,
          target: targetId,
          type,
          value
        });
      };
      
      // Process documents
      documents.forEach(doc => {
        if (!doc.content || typeof doc.content !== 'string') return;
        
        // Add document node
        addNodeIfNotExists(doc.id, doc.name, 'document');
        
        // Simple NER extraction (just an example)
        // In a real implementation, you'd use a proper NLP library or API
        const personRegex = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
        const orgRegex = /((?:[A-Z][a-z]* )*(?:Corporation|Inc\.|LLC|Ltd\.|Company|Organization))/g;
        const locationRegex = /((?:[A-Z][a-z]* )*(?:Street|Avenue|Boulevard|Road|City|Town|Country|State|County|Lake|Mountain|Valley))/g;
        
        // Extract people
        const people = [...new Set(doc.content.match(personRegex) || [])];
        people.forEach((person, i) => {
          const personId = `person_${doc.id}_${i}`;
          addNodeIfNotExists(personId, person, 'person');
          addLink(doc.id, personId, 'mentions');
        });
        
        // Extract organizations
        const orgs = [...new Set(doc.content.match(orgRegex) || [])];
        orgs.forEach((org, i) => {
          const orgId = `org_${doc.id}_${i}`;
          addNodeIfNotExists(orgId, org, 'organization');
          addLink(doc.id, orgId, 'mentions');
        });
        
        // Extract locations
        const locations = [...new Set(doc.content.match(locationRegex) || [])];
        locations.forEach((location, i) => {
          const locationId = `loc_${doc.id}_${i}`;
          addNodeIfNotExists(locationId, location, 'location');
          addLink(doc.id, locationId, 'mentions');
        });
        
        // If there are people and organizations, create some relationships
        people.forEach((person, i) => {
          const personId = `person_${doc.id}_${i}`;
          orgs.forEach((org, j) => {
            const orgId = `org_${doc.id}_${j}`;
            // Only create a link if both exist
            if (Math.random() > 0.7) { // Only create some relationships
              addLink(personId, orgId, 'associated with');
            }
          });
        });
      });
      
      // Process artifacts for concepts
      artifacts.forEach(artifact => {
        if (!artifact.content || typeof artifact.content !== 'string') return;
        
        // Add artifact node
        addNodeIfNotExists(artifact.id, artifact.name || 'Artifact', 'document');
        
        // Simple extraction of concepts (keywords)
        const words = artifact.content
          .split(/\s+/)
          .filter(word => word.length > 5)
          .map(word => word.replace(/[^\w]/g, ''))
          .filter(word => word.length > 0);
          
        // Get top 5 most frequent words as concepts
        const wordFrequency = {};
        words.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
        
        Object.entries(wordFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([word, count], i) => {
            const conceptId = `concept_${artifact.id}_${i}`;
            addNodeIfNotExists(conceptId, word, 'concept');
            addLink(artifact.id, conceptId, 'contains', count);
          });
      });
      
      // If we have very few nodes, create some dummy data for demonstration
      if (nodes.value.length < 5) {
        createDummyData();
      }
      
      // Initialize the graph
      setTimeout(() => {
        initGraph();
      }, 10);
    }
    
    // Create dummy data for demonstration
    function createDummyData() {
      nodes.value = [
        { id: "1", name: "Document 1", type: "document", connections: 0 },
        { id: "2", name: "John Smith", type: "person", connections: 0 },
        { id: "3", name: "Acme Corp", type: "organization", connections: 0 },
        { id: "4", name: "New York City", type: "location", connections: 0 },
        { id: "5", name: "Project Alpha", type: "concept", connections: 0 },
        { id: "6", name: "Annual Meeting", type: "event", connections: 0 },
        { id: "7", name: "Jane Doe", type: "person", connections: 0 },
        { id: "8", name: "Quarterly Report", type: "document", connections: 0 },
        { id: "9", name: "Global Solutions Ltd.", type: "organization", connections: 0 },
      ];
      
      links.value = [
        { source: "1", target: "2", type: "mentions", value: 2 },
        { source: "1", target: "3", type: "mentions", value: 1 },
        { source: "1", target: "4", type: "mentions", value: 1 },
        { source: "1", target: "5", type: "contains", value: 3 },
        { source: "2", target: "3", type: "works at", value: 2 },
        { source: "2", target: "6", type: "attended", value: 1 },
        { source: "3", target: "4", type: "located in", value: 1 },
        { source: "7", target: "3", type: "works at", value: 2 },
        { source: "7", target: "2", type: "collaborates with", value: 3 },
        { source: "8", target: "3", type: "about", value: 2 },
        { source: "8", target: "5", type: "discusses", value: 2 },
        { source: "9", target: "3", type: "competitor of", value: 1 },
        { source: "7", target: "9", type: "former employee of", value: 1 },
      ];
      
      // Update connections
      links.value.forEach(link => {
        const source = nodes.value.find(n => n.id === link.source);
        const target = nodes.value.find(n => n.id === link.target);
        if (source) source.connections++;
        if (target) target.connections++;
      });
    }
    
    // Initialize the graph when mounted
    Vue.onMounted(() => {
      // Add a small delay to ensure the container has been rendered
      setTimeout(() => {
        createDummyData(); // Start with dummy data
        initGraph();
      }, 100);
    });
    
    // Update the graph layout when window is resized
    Vue.onBeforeUnmount(() => {
      window.removeEventListener('resize', initGraph);
    });
    
    Vue.onMounted(() => {
      window.addEventListener('resize', initGraph);
    });
    
    return {
      graphContainer,
      extractRelationships,
      nodes,
      links,
      currentLayout,
      setLayout
    };
  }
};
