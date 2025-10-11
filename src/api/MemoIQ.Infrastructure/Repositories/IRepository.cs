using MemoIQ.Infrastructure.Models;

namespace MemoIQ.Infrastructure.Repositories
{
    public interface IRepository<T> where T : BaseEntity
    {
        Task<IEnumerable<T>> GetAllAsync();
        Task<T> GetByIdAsync(string id);
        Task<T> CreateAsync(T entity);
        Task<T> UpdateAsync(T entity);
        Task DeleteAsync(string id);
        Task<IEnumerable<T>> QueryAsync(string query);
        Task<IEnumerable<T>> QueryAsync(string query, object parameters);
    }
}
