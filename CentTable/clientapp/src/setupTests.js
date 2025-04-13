import '@testing-library/jest-dom';

const originalWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
        return;
    }
    originalWarn(...args);
};

jest.mock('@mui/material/ListItem', () => {
    const React = require('react');
    return function MockListItem(props) {
        const { button, ...other } = props;
        return <li {...other} />;
    };
});