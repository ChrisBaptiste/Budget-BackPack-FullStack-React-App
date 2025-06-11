# AI-README.md - GitHub Issues Guide

## Repository URL

**Full Stack App**: https://github.com/ChrisBaptiste/Budget-BackPack-FullStack-React-App

## Creating Issues

```
POST https://api.github.com/repos/ChrisBaptiste/Budget-BackPack-FullStack-React-App/issues
```

### Required Format
```json
{
  "title": "Issue title here",
  "body": "Issue description here",
  "labels": ["bug"] // or ["enhancement"] or ["task"]
}
```

## Reading Issues

### List All Issues
```
GET https://api.github.com/repos/ChrisBaptiste/Budget-BackPack-FullStack-React-App/issues
```

### Get Specific Issue
```
GET https://api.github.com/repos/ChrisBaptiste/Budget-BackPack-FullStack-React-App/issues/{issue_number}
```

## Updating Issues

```
PATCH https://api.github.com/repos/ChrisBaptiste/Budget-BackPack-FullStack-React-App/issues/{issue_number}
```

### Update Format
```json
{
  "title": "Updated title",
  "body": "Updated description",
  "state": "open" // or "closed"
}
```

## Authentication

Add this header to all requests:
```
Authorization: Bearer YOUR_GITHUB_TOKEN
```

## Common Labels

- `bug` - Something is broken
- `enhancement` - New feature
- `task` - Something to do
- `frontend` - Frontend related
- `backend` - Backend related
- `priority: high` - Important
- `priority: low` - Not urgent

## Quick Examples

### Create Bug Issue
```json
{
  "title": "Login button not working",
  "body": "The login button on the homepage doesn't respond when clicked",
  "labels": ["bug", "frontend", "priority: high"]
}
```

### Create Feature Issue
```json
{
  "title": "Add dark mode",
  "body": "Users want a dark mode option in settings",
  "labels": ["enhancement", "frontend"]
}
```

### Close Issue
```json
{
  "state": "closed"
}
```

---

**Note**: Replace `YOUR_GITHUB_TOKEN` with actual token. Replace `{issue_number}` with actual issue number.