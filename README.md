# Setup

After cloning the repo, run the following command from within the main folder:

```
npm install
```

After that, a local instance can be run with this command:
```
npm run dev
```

Most development code is in the src folder, with App.jsx holding the HTML and JS code for the main page (as a React file) and style.css holding the style sheet for the whole page.

There should not be reason to touch main.jsx; it just wraps App.jsx. 

index.html should usually go untouched unless you're making structural changes. It also wraps App.jsx but is responsible for being the url where App.jsx can be found and setting page metadata, as well as linking in the style sheets and external modules.
