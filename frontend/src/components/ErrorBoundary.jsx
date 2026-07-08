import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err) {
    return { error: err };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#f87171', fontSize: '14px', lineHeight: 1.6 }}>
          ⚠️ {this.props.fallback || 'Something went wrong here. Try switching tabs and coming back.'}
        </div>
      );
    }
    return this.props.children;
  }
}
