# Math & CP Blog

A modern blog platform for mathematics and competitive programming content with LaTeX support, code highlighting, and admin authentication.

## Features

- 📝 Create, edit, and delete blog posts
- 🔐 Secure admin authentication with password hashing
- 🎨 Dark mode support
- 📐 LaTeX math rendering (KaTeX)
- 💻 Code syntax highlighting (Prism.js)
- 🏷️ Custom and suggested tags
- 🔍 Search and filter functionality
- 💾 SQLite database for persistent storage
- 📱 Responsive design

## Project Structure

```
math-cp-blog/
├── server.js           # Express backend server
├── package.json        # Node.js dependencies
├── blog.db            # SQLite database (created automatically)
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Create project directory:**

   ```bash
   mkdir math-cp-blog
   cd math-cp-blog
   ```

2. **Create the files:**
   - Copy `server.js` to the root directory
   - Copy `package.json` to the root directory
   - Create a `public` folder
   - Copy `index.html` to the `public` folder
   - Copy `script.js` to the `public` folder

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

   For development with auto-restart:

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

6. **Set up admin password:**
   On first visit, you'll be prompted to create an admin password (minimum 4 characters)

## Usage

### Creating Posts

1. Click "Admin Login" and enter your password
2. Click "New Post"
3. Fill in:
   - Title
   - Short Description (shown in post list)
   - Category (Math or CP)
   - Difficulty (Easy, Medium, Hard)
   - Tags (custom or suggested)
   - Content (supports LaTeX and code blocks)

### Writing Content

**LaTeX Math:**

- Inline: `$x^2 + y^2 = z^2$`
- Display: `$$\int_0^1 x^2 dx$$`

**Code Blocks:**

```cpp
int main() {
    cout << "Hello World!";
    return 0;
}
```

**Markdown Support:**

- Headers: `# H1`, `## H2`, `### H3`
- Lists: `- item` or `1. item`
- Paragraphs: Separated by blank lines

### Features

- **Dark Mode:** Toggle with sun/moon icon
- **Search:** Find posts by title, description, or content
- **Filter by Tags:** Select tags from dropdown
- **Categories:** Filter by Math or CP
- **Direct Links:** Share posts with URL hash (e.g., `#post=post_123`)

## API Endpoints

### Authentication

- `GET /api/auth/check` - Check if password is set and if authenticated
- `POST /api/auth/setup` - Set initial admin password
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (requires auth)
- `PUT /api/posts/:id` - Update post (requires auth)
- `DELETE /api/posts/:id` - Delete post (requires auth)

### Settings

- `GET /api/settings/:key` - Get setting value
- `POST /api/settings/:key` - Set setting value

## Database Schema

### admin table

- `id` - Primary key
- `password` - Bcrypt hashed password

### posts table

- `id` - Primary key (TEXT)
- `title` - Post title
- `description` - Short description
- `content` - Full content (supports markdown, LaTeX, code)
- `category` - "math" or "cp"
- `tags` - JSON array of tags
- `difficulty` - "easy", "medium", or "hard"
- `timestamp` - Creation timestamp
- `updated` - Last update timestamp

### settings table

- `key` - Setting name
- `value` - Setting value

## Security Notes

- Passwords are hashed using bcrypt (10 rounds)
- Sessions expire after 24 hours
- CSRF protection via session cookies
- Change the session secret in production!

## Customization

### Change Port

Edit `server.js`:

```javascript
const PORT = 3000; // Change to your desired port
```

### Change Session Secret

Edit `server.js`:

```javascript
secret: "your-secret-key-change-this-in-production";
```

### Modify Suggested Tags

Edit `public/script.js`:

```javascript
suggestedTags: {
  math: ['your', 'custom', 'tags'],
  cp: ['your', 'custom', 'tags']
}
```

## Troubleshooting

**Database locked error:**

- Make sure only one instance of the server is running
- Check file permissions on `blog.db`

**Port already in use:**

- Change the PORT in `server.js`
- Or kill the process using port 3000

**Can't login:**

- Check the console for errors
- Try clearing cookies
- Restart the server

## Development

To reset the database:

```bash
rm blog.db
# Restart server
npm start
```

## License

MIT

## Support

For issues or questions, please check:

1. Node.js version (v14+)
2. Dependencies installed (`npm install`)
3. Server running (`npm start`)
4. Console errors (browser & terminal)
