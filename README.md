# PGAi Team Project

Name of the application goes here -- followed by a brief description (elevator pitch) of the application.

## Installing / Getting started

To access the deployed application, visit http://cs264sp25-homework.github.io/team-05/

To use the application, log in using your Google account, giving the app permission to view and edit calendar events. To interact with the chat interface, use the button on the top left of the screen.

## Developing

Before developing, make sure that all necessary dependencies have been installed by running the following command:

```shell
pnpm install
```

When developing locally, simply ensure that you run the following command in one terminal:

```shell
npx convex dev
```

In another terminal, the appropriate environment variables. Replace YOUR_API_KEY_HERE with your OpenAI API key.

```shell
npx convex env set GOOGLE_OAUTH_REDIRECT_URI=“https://suitable-cobra-84.clerk.accounts.dev/v1/oauth_callback”
npx convex env set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3VpdGFibGUtY29icmEtODQuY2xlcmsuYWNjb3VudHMuZGV2JA
npx convex env set CLERK_SECRET_KEY=sk_test_P0Ee1F2XwswNkDQWu1JNxyrT6wdler3u4catiPOwSU
npx convex env set OPENAI_API_KEY=YOUR_API_KEY_HERE
```

Then in the other terminal, ensure that you are running the following command:

```shell
pnpm run dev
```

## Licensing

Refer to the [Project Repository License](./LICENSE.md) for information on how the project is licensed.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
