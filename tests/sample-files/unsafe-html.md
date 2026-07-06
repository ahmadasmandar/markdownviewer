# Unsafe HTML Test

This file contains unsafe HTML that should be sanitized.

<script>alert('XSS Attack');</script>

<div onclick="alert('clicked')">Click me!</div>

<iframe src="javascript:alert('iframe')"></iframe>

Here is standard markdown content below the unsafe scripts.
