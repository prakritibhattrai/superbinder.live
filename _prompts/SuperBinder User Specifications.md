Below is a comprehensive specification summarizing all the key features we need for SuperBinder. This focuses on the *business requirements* and is the basis for a developer to design a different app layout or architecture while still meeting the business goals.

---

### SuperBinder Functional Specification

#### Overview
SuperBinder is a real-time collaboration platform enabling multiple humans and AI agents to interact, evaluate, and generate documents. It supports document management, advanced search, clipping, real-time transcription, AI synthesis, and group chat, all synchronized across users via websockets.

#### General Requirements
1. **Real-Time Collaboration**:
   - Multiple humans and AI agents interact simultaneously in a shared session.
   - All actions (document additions, clips, transcriptions, chat, etc.) sync instantly across all users/devices in the session via Socket.io websockets.

2. **Session Management**:
   - Each user receives a unique UUID on joining, stored in `localStorage`.
   - Users enter a display name and channel name to join or create a session.
   - Channels are created if new or joined if existing; channel names are stored in `localStorage`.
   - No login or JWT required; access is open via channel name.

3. **Responsive Design**:
   - Desktop: 3-column layout (documents, viewer, chat).
   - Mobile: Columns stack full-width.

4. **Technologies**:
   - Frontend: Vue.js 3.2 with Tailwind CSS.
   - Real-Time: Socket.io for websocket communication.
   - Transcription: DeepGram API (to be integrated later).
   - AI: LLM outputs via websocket for synthesis and chat participation.

---

### Key Features

#### 1. Document Management
- **Purpose**: Users collaboratively manage and access documents within a session.
- **Features**:
  - **Add Documents**: Users can upload text, Word, PDF, or image files.
    - Documents are session-specific and synced to all users via websocket.
  - **List Documents**: Display all session documents in an expandable sidebar (left column on desktop).
  - **Sync**: Adding/removing a document updates all users’ views instantly.

#### 2. Document Viewer with Tabs
- **Purpose**: Central area (middle column) for viewing and interacting with documents in multiple modes.
- **Tabs**:
  - **Full Mode**:
    - Displays full text, Word, or PDF documents with preserved formatting (HTML, DOCX, PDF layout).
    - Scrollable content with a full-width search bar at the top.
    - **Advanced Search**:
      - Keyword matching across documents, order-agnostic, and proximity-aware (e.g., “weather forecast Maine” matches “forecast today in Maine looks gusty” or “Maine’s forecast is gusty”).
      - Returns collapsed segments with matched keywords; expand to paragraph-size snippets.
      - Clicking a snippet opens the full document, scrolled to the match with keywords highlighted.
    - **Clipping**:
      - “Scissors” icon on search results creates a clip.
      - Manual text selection with a “Clip” button isolates selected content.
      - Clips retain original formatting (tables, styles, etc.), not just plain text.
  - **Clips Mode**:
    - Displays clips as cards (3-column grid on desktop, single-column on mobile).
    - Each card shows a content snippet, upvote/downvote buttons, and a delete option.
    - Clicking a clip jumps to its exact location in the source document.
    - Votes sync in real-time across users.
  - **Transcribe Mode** (Pending DeepGram):
    - Real-time transcription from audio input (browser’s recorder on desktop/mobile).
    - Multiple devices can transcribe; each user’s transcription is separated (1-2 columns or cards if more).
    - Text renders as sentences via DeepGram API over websockets.
    - **Sentence Flagging**:
      - Flag a sentence to trigger a search across documents for matches.
      - Matching clips are linked to the sentence (shown with a “Clips” icon and count).
      - Clicking “Clips” filters `Clips Mode` to related clips.
      - “Synthesize” button sends sentence and clips to AI for narrative generation.
  - **Synthesize Mode**:
    - AI generates narratives from flagged sentences and clips.
    - Outputs display as cards with configurable prompts (system/user) for tone/context.
    - Users can delete synthesis outputs; deletions sync across users.

#### 3. Real-Time Chat
- **Purpose**: Right column for group communication among humans and AI agents.
- **Features**:
  - **Draft Mode**: Users see others typing in real-time (grey box); multiple users can type concurrently.
  - **Posted Messages**: On Enter, messages solidify (colored box, unique random color per user), scrolling up like a group chat.
  - **AI Participation**: AI agents read and contribute to chat based on their roles (e.g., “I’ve added 3 clips…”).
  - **Mentions**: Users can `@displayName` others; display names are configurable.
  - **Sync**: All chat activity (drafts, posts, AI messages) syncs instantly across users.

#### 4. Real-Time Synchronization
- **Mechanism**: Socket.io websockets ensure all actions sync across users in a channel.
- **Message Types**:
  - **Session**: `join-channel`, `leave-channel`, `user-list`.
  - **Documents**: `add-document`, `remove-document`.
  - **Clips**: `add-clip`, `remove-clip`, `vote-clip`.
  - **Transcription**: `transcription-update`, `flag-sentence`.
  - **Synthesis**: `add-synthesis`, `remove-synthesis`.
  - **Chat**: `chat-draft`, `chat-message`, `agent-message`.
- **Routing**: Messages broadcast to all users in the channel, identified by `userUuid` and `channelName`.
- **State**: Time-based sequences for documents, clips, transcriptions, synthesis, and chat history.

#### 5. AI Integration
- **Roles**: AI agents generate clips, synthesize narratives, and participate in chat.
- **Output**: LLM outputs return via websocket to all users simultaneously.
- **Configurability**: Synthesis includes customizable system/user prompts.

#### 6. User Experience
- **Layout**: 
  - Desktop: Left (documents), Middle (viewer with tabs), Right (chat).
  - Mobile: Stacked full-width columns.
- **Interactivity**: 
  - Search results collapse/expand, clips vote/delete, chat drafts solidify.
  - Intuitive UI with Tailwind styling (e.g., purple accents for actions).
- **Feedback**: Real-time updates reflect all user/AI actions instantly.

---

### Technical Details
- **Session Setup**:
  - Initial prompt for display name and channel name; stored in `localStorage`.
  - No authentication; channel name is the access key.
- **Document Handling**:
  - Preserve formatting (HTML, DOCX, PDF) in viewer and clips.
  - Advanced search matches keywords proximally with context snippets.
- **Transcription** (Future):
  - DeepGram API streams audio to text, grouped by user/device via websockets.
- **AI**:
  - LLM outputs for synthesis and chat routed through server-side websocket logic.
- **Sync**:
  - All actions timestamped and broadcast to channel users.
  - Server maintains active user/channel inventory.

---

### Example Scenarios
1. **Document Collaboration**:
   - User A uploads a PDF; all see it in the sidebar.
   - User B searches “data trends”; clips a match; all see the clip in `Clips Mode`.
2. **Chat Interaction**:
   - User C types “Check the report”; User D sees draft, responds; AI adds “Found 2 clips.”
3. **Transcription & Synthesis**:
   - User E records audio; transcription appears; flags a sentence; AI synthesizes a summary.

---

### Summary
SuperBinder enables:
- Unlimited document addition and shared access.
- Document viewing, advanced search, clipping, voting, transcription, and synthesis.
- Real-time chat with human/AI participation.
- Seamless sync across users/devices via websockets.

