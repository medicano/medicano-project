export default () => ({
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});
