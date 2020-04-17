module.exports = {
  siteMetadata: {
    title: `Fione`,
  },
  plugins: [
    {
      resolve: 'gatsby-plugin-i18n',
      options: {        
        langKeyDefault: 'en',
        useLangKeyLayout: false
      }
    },
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/docs`,
        name: 'docs',
      },
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          `gatsby-remark-autolink-headers`,
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
	      aliases: {
                sh: "shell"
              }
            }
          }
        ]
      }
    },
    `gatsby-plugin-styled-components`,
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: 'UA-34667351-7',
      },
    },
    {
      resolve: `gatsby-plugin-google-adsense`,
      options: {
          publisherId: `ca-pub-0248074489415800`
      },
    },
  ],
}
