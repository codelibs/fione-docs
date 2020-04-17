'use strict';

const path = require('path');

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions
  const documentationTemplate = path.resolve(`src/templates/documentation.js`);
  const redirectTemplate = path.resolve(`src/templates/redirect.js`);
  return graphql(`
  {
    allMarkdownRemark(
      limit: 1000,
      sort: { order:ASC, fields: fileAbsolutePath },
      filter: { fileAbsolutePath: { regex: "/docs/" } }
    ) {
      edges {
        node {
          fileAbsolutePath
          html
          headings {
            value
            depth
          }
          frontmatter {
            title
          }
        }
      }
    }
  }
  `).then(result => {
    if (result.errors) {
      throw result.errors
    }

    // TODO refactoring...
    let nav_en = [];
    let nav_ja = [];

    result.data.allMarkdownRemark.edges.forEach(({ node }) => {
      const nav = getLang(node.fileAbsolutePath) === 'en' ? nav_en : nav_ja;
      if (node.fileAbsolutePath.indexOf('index') > 0) {
        const parent = { title: node.frontmatter.title, children: [], redirectFrom: getDocPath(node) };
        
        nav.push(parent);
      } else {
        const parent = nav[nav.length - 1];
        if (!parent.path) {
          parent.path = getDocPath(node);
        }
  
        parent.children.push({ title: node.frontmatter.title, path: getDocPath(node) });
      }
    });

    result.data.allMarkdownRemark.edges.forEach(({ node }, i) => {
      const lang = getLang(node.fileAbsolutePath)
      const nav = lang === 'en' ? nav_en : nav_ja;
      if (node.fileAbsolutePath.indexOf('index') > 0) {
        createPage({
          path: getDocPath(node),
          component: redirectTemplate,
          context: { to: getDocPath(result.data.allMarkdownRemark.edges[i+1].node) }
        })
      } else {
        createPage({
          path: getDocPath(node),
          component: documentationTemplate,
          context: { page: node, nav, lang }
        })
      }
    });
  })
}

function getLang(fileAbsolutePath) {
  if (fileAbsolutePath.indexOf('/src/docs/ja/') > 0) {
    return 'ja';
  }
  return 'en';
}

function getDocPath({ fileAbsolutePath }) {
  const lang = getLang(fileAbsolutePath)
  const ext = path.extname(fileAbsolutePath);
  const file = stripOrderingNumbers(path.basename(fileAbsolutePath, ext));
  const dir = stripOrderingNumbers(path.dirname(fileAbsolutePath).split(path.sep).pop());
  return `/docs${lang === 'en' ? '' : `/${lang}`}/${dir}${file === 'index' ? '' : `/${file}`}`;
}

function stripOrderingNumbers(str) {
  return str.replace(/^(\d+-)/, '');
}