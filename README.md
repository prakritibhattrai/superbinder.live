# SuperBinder.live


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

   Create a .env file and modify to get the appropriate API Keys:

   ```bash
    cp .env.example .env
   ```

4. **Start the Development Server**

   Using npm:

   If you don't have `nodemon` installed, run the following to install it for running the backend server:
   run the following to install it globally
   ```bash
   npm install -g nodemon
   ```

   or as a dev dependency in the project:
   ```bash
   npm install --save-dev nodemon
   ```

   Then run the node.js server:

   ```bash
   nodemon index.js 
   ```

5. **Access the Application**

   Open your browser and navigate to `http://localhost:3000`

## Usage
Forthcoming

## Technologies Used

- **Vue.js:** Frontend framework for building interactive user interfaces.
- **Composition API:** Provides a more flexible and scalable way to manage component logic.
- **JSZip:** Enables ZIP file creation for exporting multiple outputs.
- **docx:** Facilitates DOCX file generation from content.
- **jsPDF:** Allows PDF generation and customization.
- **Markdown-it:** Converts Markdown content to HTML for rendering purposes.
- **WebSockets:** Manages real-time communication for AI agent interactions.
- **Tailwind CSS:** Utilized for styling components with utility-first CSS classes.

## Contributing

We welcome contributions to enhance SuperBinder.live! Whether it's reporting bugs, suggesting features, or submitting pull requests, your participation helps improve the project.

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

Please ensure your code adheres to the project's coding standards and passes all tests before submitting a pull request.

## License

This project is licensed under the [MIT License](https://en.wikipedia.org/wiki/MIT_License).

---
