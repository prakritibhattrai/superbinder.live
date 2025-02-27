import { useHistory } from '../composables/useHistory.js';
import { useRealTime } from '../composables/useRealTime.js';

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
      <div class="flex mb-2 justify-between items-center">
        <div class="flex text-xs">
          <button class="px-2 py-1 bg-gray-700 rounded-l hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'force' }" @click="setLayout('force')">Force</button>
          <button class="px-2 py-1 bg-gray-700 hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'radial' }" @click="setLayout('radial')">Radial</button>
          <button class="px-2 py-1 bg-gray-700 rounded-r hover:bg-gray-600" :class="{ 'bg-gray-600': currentLayout === 'tree' }" @click="setLayout('tree')">Tree</button>
        </div>
        <div class="text-xs text-gray-400">
          <button class="text-blue-400 hover:underline" @click="navigateToDocuments">View Documents</button>
        </div>
      </div>
      <div ref="graphContainer" class="flex-1 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden"></div>
      <div class="mt-2 text-gray-400 text-sm">
        <div v-if="nodes.length === 0">No relationships extracted yet. Click 'Extract' to analyze documents.</div>
        <div v-else>Found {{ nodes.length }} entities and {{ links.length }} relationships from documents.</div>
      </div>
    </div>
  `,
  setup() {
    const { gatherLocalHistory } = useHistory();
    const { emit } = useRealTime();
    const graphContainer = Vue.ref(null);
    const nodes = Vue.ref([]);
    const links = Vue.ref([]);
    const currentLayout = Vue.ref('force');
    let simulation = null;
    let svg = null;
    let width = 0;
    let height = 0;
    
    // Function to navigate to Documents tab
    function navigateToDocuments() {
      emit('update-tab', { tab: 'Documents', subTab: 'Viewer' });
    }
    
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
        .attr("stroke-width", d => {
          // Make document-to-document links thicker
          if (d.source.type === 'document' && d.target.type === 'document') {
            return Math.sqrt(d.value) + 2;
          }
          return Math.sqrt(d.value);
        })
        .attr("stroke", d => {
          // Use different colors for different types of links
          if (d.source.type === 'document' && d.target.type === 'document') {
            return "#9c27b0"; // Purple for document-document links
          }
          return "#999";
        });
      
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
        .selectAll("circle")
        .data(nodes.value)
        .join("circle")
        .attr("r", d => {
          // Make document nodes larger
          if (d.type === 'document') {
            return Math.max(10, 5 + d.connections);
          }
          return Math.max(5, 3 + d.connections);
        })
        .attr("fill", d => typeToColor(d.type))
        .attr("stroke", d => {
          // Add stroke to document nodes
          return d.type === 'document' ? "#fff" : "none";
        })
        .attr("stroke-width", d => d.type === 'document' ? 2 : 1.5)
        .on("mouseover", (event, d) => {
          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
          
          let tooltipContent = `<strong>${d.name}</strong><br/>Type: ${d.type}<br/>Links: ${d.connections}`;
          
          // For document nodes, add a "View" link
          if (d.type === 'document') {
            tooltipContent += `<br/><a href="#" style="color: #8be9fd; text-decoration: underline;">View document</a>`;
          }
          
          tooltip.html(tooltipContent)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        })
        .on("click", (event, d) => {
          // Navigate to document when clicking on document nodes
          if (d.type === 'document') {
            // Emit event to view the document
            emit('view-document', { documentId: d.id });
            // Navigate to documents tab
            navigateToDocuments();
          }
        })
        .call(drag(simulation));
      
      // Create text labels
      const labels = g.append("g")
        .selectAll("text")
        .data(nodes.value)
        .join("text")
        .text(d => d.name)
        .attr("font-size", d => d.type === 'document' ? "10px" : "8px")
        .attr("font-weight", d => d.type === 'document' ? "bold" : "normal")
        .attr("dx", 8)
        .attr("dy", ".35em")
        .attr("fill", d => d.type === 'document' ? "#8be9fd" : "white");
      
      // Create link labels
      const linkLabels = g.append("g")
        .selectAll("text")
        .data(links.value)
        .join("text")
        .text(d => {
          // Only show labels for document-to-document links or when the link has a high value
          if ((d.source.type === 'document' && d.target.type === 'document') || d.value > 1) {
            return d.type;
          }
          return '';
        })
        .attr("font-size", "7px")
        .attr("fill", d => (d.source.type === 'document' && d.target.type === 'document') ? "#ff79c6" : "lightgray")
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
        .force("link", d3.forceLink(links.value).id(d => d.id).distance(d => {
          // Make document-to-document links longer for better visibility
          if (d.source.type === 'document' && d.target.type === 'document') {
            return 200;
          }
          return 100;
        }))
        .force("charge", d3.forceManyBody().strength(d => {
          // Make document nodes have stronger repulsion
          return d.type === 'document' ? -400 : -200;
        }))
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
      
      // Add all documents as primary nodes
      documents.forEach(doc => {
        if (!doc.content || typeof doc.content !== 'string') return;
        
        // Add document node with "document" type
        addNodeIfNotExists(doc.id, doc.name || 'Untitled Document', 'document');
        
        // Process document content for entities
        const personRegex = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
        const orgRegex = /((?:[A-Z][a-z]* )*(?:Corporation|Inc\.|LLC|Ltd\.|Company|Organization|Institute|Association|Agency|Department|Ministry|Committee|Commission|Authority))/g;
        const locationRegex = /((?:[A-Z][a-z]* )*(?:City|Town|Country|State|County|Province|Region|Street|Avenue|Boulevard|Park|University|College|School|Hospital|Center|Centre))/g;
        
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
      });
      
      // Find relationships between documents based on common entities
      if (documents.length > 1) {
        // Create a map of entities to documents that mention them
        const entityToDocuments = {};
        
        // Collect all entity IDs
        const allEntityIds = links.value.map(link => link.target);
        
        // For each entity, find all documents that mention it
        allEntityIds.forEach(entityId => {
          const docsWithEntity = links.value
            .filter(link => link.target === entityId)
            .map(link => link.source);
            
          entityToDocuments[entityId] = docsWithEntity;
        });
        
        // Create links between documents that share entities
        Object.entries(entityToDocuments).forEach(([entityId, docIds]) => {
          if (docIds.length > 1) {
            // Get the entity name and type
            const entity = nodes.value.find(n => n.id === entityId);
            if (!entity) return;
            
            // Connect documents that share this entity
            for (let i = 0; i < docIds.length; i++) {
              for (let j = i + 1; j < docIds.length; j++) {
                const docAId = docIds[i];
                const docBId = docIds[j];
                
                // Only create links between document nodes
                const docA = nodes.value.find(n => n.id === docAId);
                const docB = nodes.value.find(n => n.id === docBId);
                
                if (docA?.type === 'document' && docB?.type === 'document') {
                  // Check if link already exists
                  const existingLink = links.value.find(
                    l => (l.source === docAId && l.target === docBId) ||
                         (l.source === docBId && l.target === docAId)
                  );
                  
                  if (existingLink) {
                    // Increment weight of existing link
                    existingLink.value += 1;
                  } else {
                    // Create new link
                    addLink(docAId, docBId, `share ${entity.type} "${entity.name}"`, 1);
                  }
                }
              }
            }
          }
        });
      }
      
      // If no documents are found, show a message
      if (nodes.value.length === 0) {
        alert("No documents found. Please upload documents in the Documents section first.");
        return;
      }
      
      // Initialize the graph
      setTimeout(() => {
        initGraph();
      }, 10);
    }
    
    // Initialize the graph when mounted
    Vue.onMounted(() => {
      // Add a small delay to ensure the container has been rendered
      setTimeout(() => {
        // Check if there are documents
        const history = gatherLocalHistory();
        const documents = history.documents || [];
        
        if (documents.length > 0) {
          extractRelationships(); // Start with real documents if available
        } else {
          // Just initialize an empty graph
          initGraph();
        }
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
      setLayout,
      navigateToDocuments
    };
  }
};
