# Migration Notice Setup Guide

## Overview

This application includes a **blocking migration notice UI** that displays when users visit the site. This is designed to inform users that the service has moved to a new location and automatically redirect them after a countdown.

## Features

- **Completely Blocking**: Prevents all interaction with the underlying application
- **Positive Design**: Uses a friendly, professional gradient design with a success icon
- **Configurable URL**: The destination URL is set via environment variable
- **Auto-Redirect**: Automatically redirects users after 10 seconds
- **Manual Navigation**: Users can click the "Visit New Site" button to navigate immediately
- **Responsive**: Works on all device sizes (desktop, tablet, mobile)
- **No JavaScript Required**: The UI displays immediately, even before JavaScript loads

## How It Works

### 1. HTML Component

The migration notice is embedded directly in [src/web/index.html](../../src/web/index.html) as the first element in the `<body>` tag. It includes:

- A full-screen overlay with backdrop blur
- A gradient card with success icon
- "We've Moved!" heading
- Migration message
- Call-to-action button
- 10-second countdown timer

### 2. Server-Side URL Injection

The server reads the `MIGRATION_URL` environment variable and injects it into the HTML page before serving it to the client. This is handled in [src/routes/static.js](../../src/routes/static.js).

```javascript
// The server injects this script tag into the HTML:
<script>window.MIGRATION_URL = 'https://your-new-url.com';</script>
```

### 3. Client-Side Behavior

The inline JavaScript in the HTML:
- Reads the `window.MIGRATION_URL` value
- Sets the button's `href` attribute
- Starts a 10-second countdown
- Automatically redirects when countdown reaches zero
- Prevents scrolling and interaction with the underlying page

## Configuration

### Setting the Migration URL

#### For Render.com Deployment

1. Go to your Render.com dashboard
2. Select your service
3. Navigate to **Environment** section
4. Add a new environment variable:
   - **Key**: `MIGRATION_URL`
   - **Value**: `https://your-new-site.com` (replace with your actual URL)
5. Click **Save Changes**
6. Render will automatically redeploy with the new configuration

#### For Local Development

Add the following line to your `.env` file:

```bash
MIGRATION_URL=https://your-new-site.com
```

#### For Google Cloud Run

Set the environment variable using the `gcloud` CLI:

```bash
gcloud run services update YOUR-SERVICE-NAME \
  --update-env-vars MIGRATION_URL=https://your-new-site.com \
  --region YOUR-REGION
```

Or via the Google Cloud Console:
1. Go to Cloud Run services
2. Select your service
3. Click **Edit & Deploy New Revision**
4. Under **Variables & Secrets** tab
5. Add environment variable:
   - **Name**: `MIGRATION_URL`
   - **Value**: `https://your-new-site.com`
6. Click **Deploy**

### Default Behavior

If `MIGRATION_URL` is not set, the migration notice will default to:
- **URL**: `https://example.com`

**Important**: Always set this environment variable before deploying to production!

## Customization

### Changing the Countdown Duration

To change the 10-second countdown, edit the following line in [src/web/index.html](../../src/web/index.html):

```javascript
let countdown = 10;  // Change this number (in seconds)
```

Also update the initial display:

```html
This page will be automatically redirected in <span id="countdown">10</span> seconds
```

### Changing the Design

All styling is inline in the HTML for immediate rendering. You can customize:

- **Colors**: Modify the gradient in `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`
- **Spacing**: Adjust `padding`, `margin` values
- **Typography**: Change `font-size`, `font-weight`, `letter-spacing`
- **Animation**: Modify the `@keyframes slideInUp` animation

### Changing the Message

Edit the text in [src/web/index.html](../../src/web/index.html):

```html
<h1>We've Moved!</h1>
<p>Our service has been successfully migrated to a new platform. Please visit our new location to continue.</p>
```

## Removing the Migration Notice

When you no longer need the migration notice:

1. **Remove the HTML**: Delete the entire `<div id="migration-overlay">` section from [src/web/index.html](../../src/web/index.html)
2. **Remove the inline script**: Delete the `<script>` tag that handles the countdown
3. **Remove the CSS**: Delete the `<style>` tag with the animation
4. **Revert server changes**: In [src/routes/static.js](../../src/routes/static.js), change the route handler back to:

```javascript
router.get('/', (req, res) => {
  if (isDevelopment) {
    Object.entries(developmentHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });
  }
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});
```

5. **Remove environment variable**: Delete `MIGRATION_URL` from your deployment environment

## Testing

### Test Locally

1. Set `MIGRATION_URL` in your `.env` file:
   ```bash
   MIGRATION_URL=https://test-site.com
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser

4. You should see:
   - The migration overlay appears immediately
   - The "Visit New Site" button links to `https://test-site.com`
   - The countdown starts at 10 and decreases
   - After 10 seconds, you're redirected to the test URL

### Test Before Production Deployment

1. Deploy to a staging environment first
2. Set `MIGRATION_URL` to your production URL
3. Verify:
   - The overlay displays correctly
   - The URL is correct
   - The redirect works
   - The design looks good on mobile and desktop

## Security Considerations

### URL Validation

The migration URL is escaped to prevent XSS attacks:

```javascript
const injectionScript = `<script>window.MIGRATION_URL = '${migrationUrl.replace(/'/g, "\\'")}';</script>`;
```

### HTTPS Only

**Always use HTTPS URLs** for the migration destination:
- ✅ `https://your-site.com`
- ❌ `http://your-site.com`

### Environment Variable Protection

- Never commit actual URLs to version control
- Use secrets management in your deployment platform
- Rotate or remove the variable after migration is complete

## Troubleshooting

### Issue: Migration notice doesn't appear

**Check:**
1. Is the `<div id="migration-overlay">` present in index.html?
2. Is the `display: flex;` style applied (not `display: none;`)?
3. Check browser console for JavaScript errors

### Issue: Wrong URL is displayed

**Check:**
1. Is `MIGRATION_URL` set in your environment?
2. Run `echo $MIGRATION_URL` (locally) or check your deployment dashboard
3. Did you restart/redeploy after setting the variable?
4. Check the page source to see what URL was injected

### Issue: Countdown doesn't work

**Check:**
1. Open browser console for JavaScript errors
2. Ensure the inline `<script>` tag is present in the HTML
3. Verify the `window.MIGRATION_URL` is defined (check in browser console)

### Issue: Can't interact with the page

**This is expected behavior!** The migration notice is designed to be completely blocking. To remove it, follow the "Removing the Migration Notice" section above.

## File References

- Migration UI: [src/web/index.html](../../src/web/index.html) (lines 458-599)
- Server injection: [src/routes/static.js](../../src/routes/static.js) (lines 21-47)
- Environment example: [.env.example](../../.env.example)

## Support

For questions or issues with the migration notice:
1. Check this documentation
2. Review the code in the referenced files
3. Test in a staging environment first
4. Contact the development team if issues persist
