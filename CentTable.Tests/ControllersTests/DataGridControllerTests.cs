using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CentTable.Controllers;
using CentTable.Data;
using CentTable.Models;
using CentTable.ViewModels;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace CentTable.Tests.ControllersTests
{
    public class DataGridControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;

        public DataGridControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            var store = new Mock<IUserStore<ApplicationUser>>();
            _userManagerMock = new Mock<UserManager<ApplicationUser>>(
                store.Object, null, null, null, null, null, null, null, null);
        }

        public void Dispose() => _context.Dispose();

        private DataGridController GetController(ClaimsPrincipal user)
        {
            var controller = new DataGridController(_context, _userManagerMock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
            return controller;
        }

        [Fact]
        public async Task GetDataGrids_ReturnsPublicAndPermittedGrids_ForNonAdmin()
        {
            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };
            _userManagerMock.Setup(um => um.FindByIdAsync("user1"))
                .ReturnsAsync(testUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(testUser, "Admin"))
                .ReturnsAsync(false);

            var publicGrid = new DataGrid
            {
                Id = 1,
                Name = "Public Grid",
                IsPublic = true,
                Columns = new List<Column>(),
                Rows = new List<Row>(),
                Permissions = new List<DataGridPermission>()
            };
            var privateGrid = new DataGrid
            {
                Id = 2,
                Name = "Private Grid",
                IsPublic = false,
                Columns = new List<Column>(),
                Rows = new List<Row>(),
                Permissions = new List<DataGridPermission>
                {
                    new DataGridPermission { DataGridId = 2, UserId = "user1", CanView = true }
                }
            };
            _context.DataGrids.AddRange(publicGrid, privateGrid);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user1")
            }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.GetDataGrids();

            var okResult = Assert.IsType<OkObjectResult>(result);
            var grids = Assert.IsAssignableFrom<IEnumerable<DataGrid>>(okResult.Value);
            Assert.Equal(2, grids.Count());
        }

        [Fact]
        public async Task GetDataGrid_ReturnsNotFound_WhenGridDoesNotExist()
        {
            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };
            _userManagerMock.Setup(um => um.FindByIdAsync("user1"))
                .ReturnsAsync(testUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(testUser, "Admin"))
                .ReturnsAsync(false);

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.GetDataGrid(999);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task GetDataGrid_ReturnsForbid_WhenUserNotAllowedToView()
        {
            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };
            _userManagerMock.Setup(um => um.FindByIdAsync("user1"))
                .ReturnsAsync(testUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(testUser, "Admin"))
                .ReturnsAsync(false);

            var privateGrid = new DataGrid
            {
                Id = 3,
                Name = "Private Grid",
                IsPublic = false,
                Columns = new List<Column>(),
                Rows = new List<Row>(),
                Permissions = new List<DataGridPermission>() 
            };
            _context.DataGrids.Add(privateGrid);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.GetDataGrid(3);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task CreateDataGrid_ReturnsOk_WhenCreationSuccessful()
        {
            var model = new CentTable.Data.CreateDataGridModel
            {
                Name = "New Grid",
                IsPublic = true,
                Columns = new List<CentTable.Data.CreateColumnModel>
                {
                    new CentTable.Data.CreateColumnModel
                    {
                        Name = "Column1",
                        Type = CentTable.Enums.ColumnType.String,
                        Options = string.Empty,
                        ValidationRegex = string.Empty
                    }
                }
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.CreateDataGrid(model);

            var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
            Assert.Equal(200, objectResult.StatusCode);
            var grid = Assert.IsType<DataGrid>(objectResult.Value);
            Assert.Equal("New Grid", grid.Name);
            Assert.True(grid.IsPublic);
            Assert.Single(grid.Columns);
            Assert.NotEmpty(grid.Rows);
        }

        [Fact]
        public async Task UpdateDataGrid_ReturnsNotFound_WhenGridDoesNotExist()
        {
            var model = new UpdateDataGridModel
            {
                Name = "Updated Grid",
                IsPublic = false,
                Columns = new List<CentTable.ViewModels.UpdateColumnModel>(),
                Rows = new List<CentTable.ViewModels.UpdateRowModel>()
            };

            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };
            _userManagerMock.Setup(um => um.FindByIdAsync("user1"))
                .ReturnsAsync(testUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(testUser, "Admin"))
                .ReturnsAsync(false);

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.UpdateDataGrid(999, model);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteDataGrid_ReturnsNotFound_WhenGridDoesNotExist()
        {
            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };
            _userManagerMock.Setup(um => um.FindByIdAsync("user1"))
                .ReturnsAsync(testUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(testUser, "Admin"))
                .ReturnsAsync(false);

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.DeleteDataGrid(999);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdatePermissions_ReturnsBadRequest_WhenIdMismatch()
        {
            var model = new UpdateDataGridPermissionsModel
            {
                DataGridId = 2, 
                Permissions = new List<DataGridPermissionModel>()
            };

            var adminUser = new ApplicationUser { Id = "admin", UserName = "admin" };
            _userManagerMock.Setup(um => um.FindByIdAsync("admin"))
                .ReturnsAsync(adminUser);
            _userManagerMock.Setup(um => um.IsInRoleAsync(adminUser, "Admin"))
                .ReturnsAsync(true);

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "admin"),
                new Claim(ClaimTypes.Role, "Admin")
            }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.UpdatePermissions(1, model);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Некорректный идентификатор таблицы.", badRequestResult.Value);
        }

        [Fact]
        public async Task GetAllRecords_ReturnsRecords()
        {
            var grid = new DataGrid
            {
                Id = 10,
                Name = "Grid10",
                IsPublic = true,
                Columns = new List<Column>
                {
                    new Column { Id = 100, Name = "Col1", Type = CentTable.Enums.ColumnType.String, Options = string.Empty, ValidationRegex = string.Empty }
                },
                Rows = new List<Row>
                {
                    new Row { Id = 200, Cells = new List<Cell>
                        {
                            new Cell { Id = 300, ColumnId = 100, Value = "Value1" }
                        }
                    }
                },
                Permissions = new List<DataGridPermission>()
            };
            _context.DataGrids.Add(grid);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.GetAllRecords();

            var okResult = Assert.IsType<OkObjectResult>(result);
            var records = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
            Assert.NotEmpty(records);
        }

        [Fact]
        public async Task BatchDeleteRows_ReturnsBadRequest_WhenNoRowsProvided()
        {
            var model = new BatchDeleteModel
            {
                RowIds = new List<int>() 
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.BatchDeleteRows(model);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Список строк пуст", badRequestResult.Value);
        }

        [Fact]
        public async Task BatchDeleteRows_DeletesRowsSuccessfully()
        {
            var row = new Row
            {
                DataGridId = 20,
                Cells = new List<Cell>
                {
                    new Cell { ColumnId = 1, Value = "Test" }
                }
            };
            _context.Rows.Add(row);
            await _context.SaveChangesAsync();
            int rowId = row.Id;

            var model = new BatchDeleteModel
            {
                RowIds = new List<int> { rowId }
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.BatchDeleteRows(model);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            var deletedProp = value.GetType().GetProperty("Deleted");
            Assert.NotNull(deletedProp);
            var deletedValue = deletedProp.GetValue(value);
            Assert.Equal(1, (int)deletedValue);
        }

        [Fact]
        public async Task BatchInsertRows_ReturnsNotFound_WhenDataGridDoesNotExist()
        {
            var model = new BatchInsertModel
            {
                DataGridId = 999, 
                Rows = new List<CopyRowModel>
                {
                    new CopyRowModel { Cells = new List<CopyCellModel>
                        {
                            new CopyCellModel { ColumnId = 1, Value = "Test" }
                        }
                    }
                }
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.BatchInsertRows(model);

            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("DataGrid не найден", notFoundResult.Value);
        }

        [Fact]
        public async Task BatchInsertRows_InsertsRowsSuccessfully()
        {
            var grid = new DataGrid
            {
                Id = 50,
                Name = "Grid50",
                IsPublic = true,
                Columns = new List<Column>
                {
                    new Column { Id = 500, Name = "Col1", Type = CentTable.Enums.ColumnType.String, Options = string.Empty, ValidationRegex = string.Empty }
                },
                Rows = new List<Row>(),
                Permissions = new List<DataGridPermission>()
            };
            _context.DataGrids.Add(grid);
            await _context.SaveChangesAsync();

            var model = new BatchInsertModel
            {
                DataGridId = 50,
                Rows = new List<CopyRowModel>
                {
                    new CopyRowModel { Cells = new List<CopyCellModel>
                        {
                            new CopyCellModel { ColumnId = 500, Value = "InsertedValue" }
                        }
                    }
                }
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user1") }, "TestAuth"));
            var controller = GetController(principal);

            var result = await controller.BatchInsertRows(model);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            var insertedProp = value.GetType().GetProperty("Inserted");
            Assert.NotNull(insertedProp);
            var insertedValue = insertedProp.GetValue(value);
            Assert.Equal(1, (int)insertedValue);
        }
    }
}
