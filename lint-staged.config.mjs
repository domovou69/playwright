// experiments/ holds snapshots with their own eslint configs and package.json: keep them out of the commit hook.
const skip = files => files.filter(f => !f.includes('/experiments/'));
const quote = files => files.map(f => `"${f}"`).join(' ');

export default {
  '*.{ts,mjs}': files => {
    const list = quote(skip(files));
    return list ? [`eslint --fix ${list}`, `prettier --write ${list}`] : [];
  },
  '*.{json,md}': files => {
    const list = quote(skip(files));
    return list ? [`prettier --write ${list}`] : [];
  },
};
