 

# SuperBinder.live

SuperBinder.live is a real-time collaboration platform that brings together multiple humans and AI agents to interact, evaluate, and generate documents seamlessly. It enables users to manage shared documents, search and clip content, transcribe audio in real time, synthesize insights with AI, and communicate via group chat—all synchronized instantly across all participants.

_This is only the template! You have to build your own app and create your own feature branch or fork!_

## Business Requirements

### General Features
- **Real-Time Collaboration**: Supports simultaneous interaction among multiple humans and AI agents, with all actions (e.g., document updates, chat messages, transcriptions) syncing instantly across users and devices.
- **Session Management**: Users join or create sessions using a display name and channel name, with no login or authentication required—access is open via channel name. Session data persists locally for reconnection.
- **Responsive Design**: Adapts to desktop (multi-column layout) and mobile (stacked full-width layout) interfaces, ensuring usability across devices.

### Document Management
- **Add Documents**: Users can upload a variety of file types, including text files (.txt, .js, .json, .css, .md, .html), Word documents (.docx), PDF files (.pdf), Excel sheets (.xlsx), and PowerPoint presentations (.pptx). Files are processed client-side, shared instantly across all session participants, and retain their original formatting and structure.
- **View Documents**: Documents are accessible to all users, preserving their original layout, formatting, and styling (e.g., tables, borders, shading, embedded images, charts, and graphics in Word and PDF files). Users can navigate to specific pages within documents for precise viewing.
- **Rename Documents**: Users can rename documents, with changes synced in real time across all participants, maintaining the original upload order.
- **Remove Documents**: Users can remove documents, with deletions synchronized instantly across the session.

### Document Interaction
- **Advanced Search**: 
  - Search across all session documents with keyword matching that’s order-agnostic and proximity-aware (e.g., “weather forecast Maine” matches “forecast today in Maine” or “Maine’s gusty forecast”).
  - Returns contextual snippets around matches, expandable to full paragraphs, with keywords highlighted in bright yellow (light mode) or dark yellow (dark mode).
  - Links snippets to their source documents, scrolling to the exact location (including specific pages) when viewed, with navigation between multiple matches using up/down arrows (e.g., “3 of 15 matches”).
- **Clipping**: 
  - Users can clip search results or manually selected text ranges, preserving original formatting (e.g., tables, styles, HTML structure).
  - Clips display as cards with snippets, supporting upvoting/downvoting (synced in real-time) and deletion.
  - Clicking a clip navigates to its precise location in the source document, maintaining page alignment.
  - If no text is selected, clips automatically include 50 characters on either side of a match; if text is selected, clips the exact range, retaining HTML styling.

### Real-Time Transcription
- **Audio Input**: Users can record audio from devices, with transcriptions generated in real time and separated by participant (e.g., 1-2 columns or cards for multiple users).
- **Sentence Handling**: 
  - Transcriptions render as sentences, synced across users.
  - Users can flag sentences to trigger document searches for matching content.
  - Matching clips link to flagged sentences, filterable for review.
  - A synthesis option generates AI-driven narratives from flagged sentences and clips, configurable for tone and context.

### AI Synthesis
- **Narrative Generation**: AI creates cohesive summaries or narratives from flagged transcriptions, clips, and document content, with customizable prompts for tone, context, and length.
- **Output Management**: Synthesis results display as cards, deletable by users, with deletions synced across the session. Results can be further refined or expanded via AI prompts.

### Group Chat
- **Real-Time Messaging**: 
  - Users see others typing drafts (visually distinct) and posted messages (colored uniquely per user), scrolling like a group chat.
  - Multiple users can type concurrently, with all activity (drafts, messages) synced instantly.
  - Supports automatic scrolling to new messages by default, pausing if users scroll up, resuming when scrolled back to the bottom.
- **AI Participation**: AI agents read and contribute to the chat based on their roles (e.g., reporting clip additions, responding to queries).
- **Mentions**: Users can `@displayName` others, with display names editable in real time.

### Synchronization
- **Websocket-Based**: All actions (document additions/removals/renames, clips, votes, transcriptions, synthesis, chat messages, drafts) broadcast to all session users via Socket.io, ensuring real-time consistency.
- **Data Persistence**: Actions are timestamped and sequenced (documents, clips, transcriptions, synthesis, chat history) for consistent state across users, preserving upload and interaction order.

---

## Installation

### Prerequisites
- **Node.js** (v20 or later)
- **npm** or **yarn**

### Steps
1. **Clone the Repository**
   ```bash
   git clone https://github.com/developmentation/superbinder.live.git
   cd superbinder-live
   ```

2. **Install Dependencies**
   Using npm:
   ```bash
   npm install
   ```

3. **Create an .env file**
   Create a `.env` file and modify it to include the appropriate API keys:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**
   Using npm:
   - If you don’t have `nodemon` installed, install it globally:
     ```bash
     npm install -g nodemon
     ```
     Or as a dev dependency in the project:
     ```bash
     npm install --save-dev nodemon
     ```
   - Then run the Node.js server:
     ```bash
     nodemon index.js
     ```

5. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

---

## Usage
Forthcoming

## Technologies Used
- **Vue.js**: Frontend framework for building interactive user interfaces.
- **Composition API**: Provides a flexible and scalable way to manage logic.
- **WebSockets**: Manages real-time communication via Socket.io.
- **Tailwind CSS**: Utility-first CSS for styling.
- **DeepGram API**: Real-time speech-to-text transcription (to be integrated).
- **AI LLM**: Language model outputs for synthesis and chat (via websockets).

## Contributing
We welcome contributions to enhance SuperBinder.live! Whether it’s reporting bugs, suggesting features, or submitting pull requests, your participation helps improve the project.

1. **Fork the Repository**
   Click the "Fork" button on the repository page to create your own copy.

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Commit Your Changes**
   ```bash
   git commit -m "Add your message here"
   ```

4. **Push to the Branch**
   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Open a Pull Request**
   Navigate to your forked repository and click "New Pull Request" to propose your changes.

Please ensure your code adheres to the project’s coding standards and passes all tests before submitting a pull request.

## License
This project is licensed under the [MIT License](https://en.wikipedia.org/wiki/MIT_License).
 