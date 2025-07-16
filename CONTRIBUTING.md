# Contributing to IoT-SFT

Thank you for your interest in contributing to the IoT-SFT project! This document provides guidelines for contributing to this open source project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/IoTSFT.git
   cd IoTSFT
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Write clear, documented code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes
```bash
# Run all tests
npm run test

# Run gas efficiency tests
npm run test:gas

# Run performance tests
npm run test:performance
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add your feature description"
```

Use conventional commit messages:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test improvements
- `refactor:` for code refactoring

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style Guidelines

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Use descriptive variable names
- Keep functions focused and small

## Testing Requirements

- All new features must include tests
- Maintain or improve test coverage
- Test both success and failure scenarios
- Include gas efficiency considerations

## Performance Considerations

- Consider gas costs for all contract operations
- Test scalability with performance analysis tools
- Document any performance implications

## Smart Contract Guidelines

- Follow security best practices
- Use OpenZeppelin contracts where appropriate
- Document all public functions
- Consider upgrade patterns carefully

## Documentation

- Update README.md for new features
- Add inline code documentation
- Update performance guides if applicable
- Include usage examples

## Reporting Issues

When reporting bugs or requesting features:

1. **Check existing issues** first
2. **Provide clear reproduction steps** for bugs
3. **Include relevant environment details**
4. **Suggest solutions** when possible

## Code Review Process

- All changes require review
- Address reviewer feedback promptly
- Keep pull requests focused and small
- Include performance impact analysis

## Performance Analysis

When contributing performance-related changes:

```bash
# Run performance analysis
npm run perf:multi

# Generate performance charts
npm run perf:png-demo
```

Include performance metrics in your pull request description.

## Questions and Support

- Open an issue for questions
- Provide context and examples
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to IoT-SFT! 🚀
