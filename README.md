# URL Shortener Website

A modern, fast, and simple URL shortener web application built with Node.js, Express, and SQLite.

## Features

✨ **Core Features:**
- 🔗 Shorten long URLs instantly
- 🎯 Custom short codes (optional)
- 📊 Click tracking and analytics
- 🗑️ Delete shortened URLs
- 📋 Copy to clipboard
- 📱 Fully responsive design
- 🎨 Modern, beautiful UI

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** SQLite3
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Styling:** Custom CSS with Gradient & Animations

## Project Structure

```
url-shortener/
├── server.js                 # Express server & API routes
├── package.json             # Project dependencies
├── urls.db                  # SQLite database (auto-created)
└── public/
    ├── index.html           # Main HTML file
    ├── style.css            # CSS styling
    ├── script.js            # Frontend JavaScript
    └── 404.html             # 404 error page
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- express (web framework)
- sqlite3 (database)
- cors (cross-origin support)
- body-parser (request parsing)
- dotenv (environment variables)

### Step 2: Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

You should see:
```
URL Shortener server is running on http://localhost:3000
Connected to SQLite database
Database table initialized
```

### Step 3: Open in Browser

Visit `http://localhost:3000` in your web browser and start shortening URLs!

## Usage

### Creating a Shortened URL

1. Enter your long URL in the input field
2. (Optional) Enter a custom short code (3-20 alphanumeric characters)
3. Click "Shorten URL"
4. Your shortened URL will be displayed
5. Click "Copy" to copy to clipboard

### Viewing Your URLs

The "Your Recent URLs" section shows all shortened URLs with:
- Short code/link
- Click count
- Creation date
- Original URL

### Analytics

Each shortened URL tracks:
- Number of clicks
- Creation timestamp
- Original URL

### Deleting URLs

Click the "Delete" button on any URL to permanently remove it.

## API Endpoints

### Create Shortened URL
```
POST /api/shorten
Content-Type: application/json

{
    "url": "https://example.com/very/long/url",
    "customCode": "optional-code" // Optional
}

Response:
{
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "originalUrl": "https://example.com/very/long/url"
}
```

### Redirect to Original URL
```
GET /:shortCode
Redirects to the original URL and increments click count
```

### Get Analytics
```
GET /api/stats/:shortCode

Response:
{
    "shortCode": "abc123",
    "originalUrl": "https://example.com/very/long/url",
    "clicks": 5,
    "createdAt": "2024-01-15 10:30:00"
}
```

### Get All URLs
```
GET /api/urls/all

Response: Array of all shortened URLs
```

### Delete URL
```
DELETE /api/urls/:shortCode

Response:
{
    "message": "URL deleted successfully"
}
```

## Configuration

You can modify the port by setting the PORT environment variable:

```bash
PORT=5000 npm start
```

Or create a `.env` file:
```
PORT=5000
```

## Database

The application uses SQLite3 with the following schema:

```sql
CREATE TABLE urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0
)
```

The database file (`urls.db`) is created automatically in the project root.

## Features Detail

### URL Validation
- Validates all URLs to ensure they start with `http://` or `https://`
- Prevents invalid URLs from being shortened

### Short Code Generation
- Auto-generates 6-character alphanumeric codes
- Supports custom codes (3-20 alphanumeric characters)
- Prevents duplicate codes

### Click Tracking
- Automatically increments click count on each redirect
- Displays click analytics in the UI

### Responsive Design
- Works on desktop, tablet, and mobile
- Touch-friendly buttons and inputs
- Optimized layout for all screen sizes

## Security Features

- SQL injection prevention (parameterized queries)
- CORS enabled for safe cross-origin requests
- Input validation on all endpoints
- Rate limiting ready (can be added)

## Future Enhancements

Potential features to add:
- User authentication & accounts
- URL expiration dates
- QR code generation
- Advanced analytics dashboard
- Custom domain support
- Rate limiting
- Admin panel
- Export analytics as CSV/PDF

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
PORT=3001 npm start
```

### Database Error
Delete `urls.db` and restart the server to reset the database.

### CORS Errors
Make sure you're accessing the application from your browser, not from different origins.

## License

MIT License - feel free to use and modify this project

## Support

For issues or questions, feel free to create an issue or contact the developer.

---

**Enjoy shortening your URLs! 🎉**
