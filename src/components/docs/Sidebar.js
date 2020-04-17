import React from 'react'
import { useEffect, useState } from "react"
import { map, keys, isEmpty } from 'lodash'
import GithubSlugger from 'github-slugger'
import styled from 'styled-components'

const Wrapper = styled.aside`
  position: fixed;
  top: 0;
  padding: 64px 2em 2em 2em;
  width: 20%;
  overflow: auto;
  right: 0;

  @media only screen and (max-width: 650px) {
    display: none;
  }
`
const List = styled.ul`
  padding: 2rem 0;
  display: block;
  color: #666;
  font-size: 0.875rem;
  list-style: none;
`

const ListItem = styled.li`
  margin: 0 0 0.5rem ${props => props.depth - 2}rem;

  a {
    color: inherit;
    font: inherit;
    text-decoration: none;
  }
`
ListItem.defaultProps = { depth: 2 }

const Divider = styled.li`
  margin: 1em 0 1em 0;
  border-top: 2px dashed #f0f0f0;
`

const AdSense = ({ format = "auto" }) => {
  const [state, setState] = useState({ showAds: false })

  useEffect(() => {
    if (state.showAds) {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    }
    if (window) {
      const shouldShowAds = window.innerWidth >= 650
      if (shouldShowAds) {
        setState({ showAds: true })
      }
    }
  }, [state.showAds])

  if (!state.showAds) return null

  return (
      <Ins
        className="adsbygoogle"
        data-ad-client="ca-pub-0248074489415800"
        data-ad-slot="9308613578"
        data-ad-format={format}
        data-full-width-responsive="true"
      />
  )
}

const Ins = styled.ins({
  display: "block"
})

export default ({ headings, extras }) => {
  const slugger = new GithubSlugger()
  const mainHeaders = headings.filter(({ depth }) => depth <= 3)
  if (mainHeaders.length + keys(extras).length < 3) return <aside />

  return (
    <Wrapper>
      <List>
        {mainHeaders.map(({ value, depth }) => {
          const slug = slugger.slug(value)
          return (
            <ListItem key={slug} depth={depth}>
              <a href={`#${slug}`}>{value}</a>
            </ListItem>
          )
        })}
        {isEmpty(extras) ? '' : <Divider />}
        {map(extras, (href, text) => (
          <ListItem key={href}>
            <a href={`#${href}`}>{text}</a>
          </ListItem>
        ))}
      </List>
      <AdSense />
    </Wrapper>
  )
}
