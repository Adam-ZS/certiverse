# Contributing to Certiverse

Thanks for wanting to help out! Certiverse is a small vanilla-JavaScript project
and every contribution is appreciated.

## Getting started

1. Fork the repository and clone your fork.
2. Open `index.html` in your browser, or serve the folder:

   ```sh
   python3 -m http.server 8080
   ```

   Then visit `http://localhost:8080`.

3. Make your changes. Keep the code style consistent with the existing files
   (no frameworks, plain JS, dark theme).

## Adding a credential

Certificates live in `data.js` as a `CREDENTIALS` array. Each entry:

```js
{
  id: "unique-kebab-slug",
  title: "Human-Readable Title",
  issuer: "Issuer Name",
  dateObtained: "2026-03-15",   // or null if no day is known
  expired: false,
  category: "Category Label",
  img: "certs/your-image.webp",
  verified: true,
  verificationUrl: "https://issuer.example.com/verify/123"
}
```

The demo site should only contain **fictional** credentials. If the credential
is verified, `verified` must be `true` and `verificationUrl` must be a real,
working link.

## Pull requests

* Keep PRs small and focused on a single change.
* Describe what you changed and why in the PR description.
* Test your changes locally before opening the PR.
* Ensure the site still works without any build step.

## Reporting issues

Please use the issue templates. For security issues, see
[SECURITY.md](SECURITY.md) instead.

## Code of conduct

By participating you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).