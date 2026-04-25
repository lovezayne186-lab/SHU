class NeumorphicCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const title = this.getAttribute('title') || '';
        const subtitle = this.getAttribute('subtitle') || '';
        const icon = this.getAttribute('icon') || '';
        const link = this.getAttribute('link') || '#';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 24px;
                    text-decoration: none;
                    color: inherit;
                    -webkit-tap-highlight-color: transparent;
                }
                .card {
                    display: flex;
                    align-items: center;
                    padding: 24px 20px;
                    border-radius: 20px;
                    background: #F0F0F3;
                    box-shadow: -8px -8px 16px #ffffff, 8px 8px 16px #d1d9e6;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    text-decoration: none;
                    color: #333;
                }
                .card:active {
                    box-shadow: inset -8px -8px 16px #ffffff, inset 8px 8px 16px #d1d9e6;
                }
                .icon {
                    font-size: 24px;
                    margin-right: 16px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #F0F0F3;
                    box-shadow: -4px -4px 8px #ffffff, 4px 4px 8px #d1d9e6;
                    color: #5a6b7c;
                }
                .content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 6px;
                    color: #2c3e50;
                    letter-spacing: 0.5px;
                }
                .subtitle {
                    font-size: 12px;
                    color: #7f8c8d;
                    letter-spacing: 0.2px;
                }
                .arrow {
                    font-size: 18px;
                    color: #a0aab5;
                    font-weight: 300;
                    margin-left: 12px;
                }
            </style>
            <a href="${link}" class="card">
                <div class="icon">${icon}</div>
                <div class="content">
                    <div class="title">${title}</div>
                    <div class="subtitle">${subtitle}</div>
                </div>
                <div class="arrow">&gt;</div>
            </a>
        `;
    }
}

customElements.define('neumorphic-card', NeumorphicCard);