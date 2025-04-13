using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CentTable.Controllers;
using CentTable.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Query;
using Moq;
using Xunit;

namespace CentTable.Tests.ControllersTests
{
    public class UsersControllerTests
    {
        private Mock<UserManager<ApplicationUser>> GetUserManagerMock(List<ApplicationUser> users)
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            var userManagerMock = new Mock<UserManager<ApplicationUser>>(
                store.Object, null, null, null, null, null, null, null, null);

            userManagerMock.Setup(um => um.Users)
                .Returns(new TestAsyncEnumerable<ApplicationUser>(users));
            return userManagerMock;
        }

        [Fact]
        public async Task GetUsers_ReturnsNonAdminUsers()
        {
            var adminUser = new ApplicationUser { Id = "admin1", UserName = "adminuser" };
            var nonAdminUser1 = new ApplicationUser { Id = "user1", UserName = "userone" };
            var nonAdminUser2 = new ApplicationUser { Id = "user2", UserName = "usertwo" };
            var allUsers = new List<ApplicationUser> { adminUser, nonAdminUser1, nonAdminUser2 };

            var userManagerMock = GetUserManagerMock(allUsers);
            userManagerMock.Setup(um => um.GetUsersInRoleAsync("Admin"))
                .ReturnsAsync(new List<ApplicationUser> { adminUser });

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, "admin1"),
                new Claim(ClaimTypes.Role, "Admin")
            };
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

            var controller = new UsersController(userManagerMock.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = principal }
                }
            };

            var result = await controller.GetUsers();

            var okResult = Assert.IsType<OkObjectResult>(result);
            var returnedUsers = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);

            var ids = returnedUsers
                .Select(u => u.GetType().GetProperty("Id")?.GetValue(u)?.ToString())
                .ToList();

            Assert.Equal(2, ids.Count);
            Assert.DoesNotContain("admin1", ids);
        }
    }


    public class TestAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public TestAsyncEnumerable(IEnumerable<T> enumerable) : base(enumerable) { }
        public TestAsyncEnumerable(Expression expression) : base(expression) { }

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            return new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
        }

        IQueryProvider IQueryable.Provider => new TestAsyncQueryProvider<T>(this);
    }

    public class TestAsyncEnumerator<T> : IAsyncEnumerator<T>
    {
        private readonly IEnumerator<T> _inner;
        public TestAsyncEnumerator(IEnumerator<T> inner) { _inner = inner; }
        public T Current => _inner.Current;
        public ValueTask<bool> MoveNextAsync() => new ValueTask<bool>(_inner.MoveNext());
        public ValueTask DisposeAsync() { _inner.Dispose(); return default; }
    }

    public class TestAsyncQueryProvider<TEntity> : IAsyncQueryProvider
    {
        private readonly IQueryProvider _inner;
        public TestAsyncQueryProvider(IQueryProvider inner) { _inner = inner; }
        public IQueryable CreateQuery(Expression expression) => new TestAsyncEnumerable<TEntity>(expression);
        public IQueryable<TElement> CreateQuery<TElement>(Expression expression) => new TestAsyncEnumerable<TElement>(expression);
        public object Execute(Expression expression) => _inner.Execute(expression);
        public TResult Execute<TResult>(Expression expression) => _inner.Execute<TResult>(expression);
        public IAsyncEnumerable<TResult> ExecuteAsync<TResult>(Expression expression) => new TestAsyncEnumerable<TResult>(expression);
        public Task<TResult> ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken) =>
            Task.FromResult(Execute<TResult>(expression));

        TResult IAsyncQueryProvider.ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }
    }
}
