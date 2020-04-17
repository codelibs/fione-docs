import React, { Component } from 'react'
import styled from 'styled-components'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'

const Hero = styled.div`
  z-index: 1;
  background-image: linear-gradient(
    120deg,
    #43bfb3 0%,
    #7de2d1 100%
  );
  color: #fff;
  padding: 70px;
  border-radius: 0 0 50% 50% / 8%;
  display: flex;
  justify-content: space-between;

  section:first-child {
    width: 50%;
    margin-left: 3%;
  }

  section:last-child {
    width: 45%;
  }

  h2 {
    margin-top: 1.5rem;
    font-size: 2.5em;
    margin-bottom: 0.25em;
    font-weight: bold;
    letter-spacing: 1.5px;
    line-height: 1.05em;
    display: inline-block;
  }

  h3 {
    font-size: 1.5em;
    margin-top: 0;
    margin-bottom: 1.5em;
    font-weight: 300;
  }

  @media only screen and (max-width: 800px) {
    padding: 50px 15px;
    flex-direction: column;

    h2 {
      font-size: 2.5em;
    }

    h3 {
      font-size: 1.25em;
    }

    section:first-child, section:last-child {
      width: 100%;
    }

    section:first-child {
      margin: 0 0 2em 0;
    }
  }
`

const Philosophy = styled.section`
  background: #f9f8f9;
  display: flex;
  justify-content: space-around;
  margin-top: -2em;
  padding: 5em 2em 2em 2em;

  div {
    width: 30%;
  }

  h3 {
    color: #43bfb3;
  }

  p {
    margin-top: 0;
  }

  @media only screen and (max-width: 800px) {
    flex-direction: column;

    div {
      width: 90%;
      margin: auto;
    }
  }
`

class IndexPage extends Component {
  render() {
    return (
      <div>
        <Header currentPath={this.props.location.pathname} fixed="true" lang="ja"/>
        <Hero>
          <section>
            <h2>AI プラットフォーム</h2>
            <h3>
            Fione (フィオネ) は、専門知識がなくても簡単に利用でき、
            データから有用な分析や予測をできるソフトウェアです。
            Fione はApacheライセンスで提供され、無料でご利用いただけます。
            </h3>
            <Button to="/docs/ja/getting-started/quickstart" large="true">
              クイックスタート
            </Button>
            <Button to="/docs/ja/getting-started/overview" large="true" transparent="true">
              ドキュメント
            </Button>
          </section>
          <section sytle="text-align:center;">
            <img src="/media/ja/welcome.png" alt="Fione" />
          </section>
        </Hero>
        <Philosophy>
          <div>
            <h3>簡単に利用できる</h3>
            <p>
              すべての操作はブラウザ上で行うことができます。
              Dockerの実行環境があれば、コマンド1つでFioneを起動できます。
            </p>
          </div>
          <div>
            <h3>オープンな技術</h3>
            <p>
              FioneはGitHub上で開発されるオープンソースのソフトウェアです。
              OSSの開発に自由に参加して、利用することができます。
            </p>
          </div>
          <div>
            <h3>高精度な予測</h3>
            <p>
              AutoMLにより、機械学習の専門知識がなくても、利用することができます。
              手持ちのデータをアップロードするだけで、機械学習の予測結果を取得できます。
            </p>
          </div>
        </Philosophy>
        <Footer />
      </div>
    )
  }
}

export default IndexPage
