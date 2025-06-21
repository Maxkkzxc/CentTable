using System.Linq.Dynamic.Core;
using System.Security.Claims;
using CentTable.Data;
using CentTable.Models;
using CentTable.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;

namespace CentTable.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DataGridController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public DataGridController(AppDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private bool HasPermission(DataGrid grid, string userId, string operation)
        {
            if (User.IsInRole("Admin"))
                return true;

            if (grid.IsPublic)
                return true;

            var permission = grid.Permissions.FirstOrDefault(p => p.UserId == userId);
            if (permission == null)
                return false;

            return operation.ToLower() switch
            {
                "view" => permission.CanView,
                "edit" => permission.CanEdit,
                "delete" => permission.CanDelete,
                _ => false,
            };
        }

        [HttpGet]
        public async Task<IActionResult> GetDataGrids()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var query = _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows).ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(dg => dg.IsPublic || dg.Permissions.Any(p => p.UserId == userId && p.CanView));
            }

            var grids = await query.ToListAsync();
            return Ok(grids);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDataGrid(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var grid = await _context.DataGrids
                .AsNoTracking()
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows).ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            if (!HasPermission(grid, userId, "view"))
                return Forbid("Нет прав на просмотр этой таблицы.");

            return Ok(grid);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateDataGrid([FromBody] CreateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            if (!isAdmin)
                return Forbid("Недостаточно прав для создания таблицы.");

            var grid = new DataGrid
            {
                Name = model.Name,
                IsPublic = model.IsPublic,
                Columns = model.Columns.Select(c => new Column
                {
                    Name = c.Name,
                    Type = c.Type,
                    ValidationRegex = c.ValidationRegex,
                    Options = c.Options,
                    MaxLength = c.MaxLength,
                    MinValue = c.MinValue,
                    MaxValue = c.MaxValue
                }).ToList()
            };

            _context.DataGrids.Add(grid);
            await _context.SaveChangesAsync(); 

            var loadedGrid = await _context.DataGrids
                .Include(g => g.Columns)
                .Include(g => g.Rows).ThenInclude(r => r.Cells)
                .FirstOrDefaultAsync(g => g.Id == grid.Id);

            return Ok(loadedGrid);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDataGrid(int id, [FromBody] UpdateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");

            model.Columns ??= new List<UpdateColumnModel>();
            model.Rows ??= new List<UpdateRowModel>();

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows).ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!HasPermission(grid, userId, "edit"))
                return Forbid("Нет прав для редактирования этой таблицы.");

            grid.Name = model.Name;
            grid.IsPublic = model.IsPublic;

            var modelColumnIds = model.Columns.Where(c => c.Id != 0).Select(c => c.Id).ToList();
            var columnsToRemove = grid.Columns.Where(c => !modelColumnIds.Contains(c.Id)).ToList();

            foreach (var col in columnsToRemove)
            {
                foreach (var row in grid.Rows ?? Enumerable.Empty<Row>())
                {
                    var cellsToRemove = row.Cells.Where(c => c.ColumnId == col.Id).ToList();
                    foreach (var cell in cellsToRemove)
                    {
                        _context.Cells.Remove(cell);
                        row.Cells.Remove(cell);
                    }
                }
                _context.Columns.Remove(col);
            }

            if (!grid.Columns.Any())
            {
                var rowsToDelete = grid.Rows?.ToList() ?? new List<Row>();

                foreach (var row in rowsToDelete)
                {
                    foreach (var cell in row.Cells.ToList())
                        _context.Cells.Remove(cell);

                    _context.Rows.Remove(row);
                }

            }

            foreach (var colModel in model.Columns)
            {
                if (colModel.Id != 0)
                {
                    var col = grid.Columns.FirstOrDefault(c => c.Id == colModel.Id);
                    if (col == null) continue;

                    col.Name = colModel.Name;
                    col.Type = colModel.Type;
                    col.ValidationRegex = colModel.ValidationRegex;
                    col.Options = colModel.Options;
                    col.MaxLength = colModel.MaxLength;
                    col.MinValue = colModel.MinValue;
                    col.MaxValue = colModel.MaxValue;
                }
                else
                {
                    var newCol = new Column
                    {
                        Name = colModel.Name,
                        Type = colModel.Type,
                        ValidationRegex = colModel.ValidationRegex,
                        Options = colModel.Options,
                        MaxLength = colModel.MaxLength,
                        MinValue = colModel.MinValue,
                        MaxValue = colModel.MaxValue,
                        DataGrid = grid
                    };

                    grid.Columns.Add(newCol);

                    foreach (var row in grid.Rows ?? Enumerable.Empty<Row>())
                    {
                        row.Cells.Add(new Cell
                        {
                            Column = newCol,
                            Value = "",
                            Row = row
                        });
                    }
                }
            }

            foreach (var rowModel in model.Rows)
            {
                rowModel.Cells ??= new List<UpdateCellModel>();
                var row = grid.Rows?.FirstOrDefault(r => r.Id == rowModel.Id);

                if (row != null)
                {
                    foreach (var cellModel in rowModel.Cells)
                    {
                        var cell = row.Cells.FirstOrDefault(c => c.ColumnId == cellModel.ColumnId);
                        string value = cellModel.Value is JArray ja
                            ? string.Join(",", ja.ToObject<List<string>>())
                            : cellModel.Value?.ToString() ?? "";

                        if (cell != null)
                        {
                            cell.Value = value;
                        }
                        else
                        {
                            row.Cells.Add(new Cell
                            {
                                ColumnId = cellModel.ColumnId,
                                Value = value,
                                Row = row
                            });
                        }
                    }

                    var existingColumnIds = row.Cells.Select(c => c.ColumnId).ToList();
                    foreach (var col in grid.Columns.Where(c => !existingColumnIds.Contains(c.Id)))
                    {
                        row.Cells.Add(new Cell
                        {
                            ColumnId = col.Id,
                            Value = "",
                            Row = row
                        });
                    }
                }
                else
                {
                    var newRow = new Row
                    {
                        DataGridId = grid.Id,
                        Cells = rowModel.Cells.Select(cm => new Cell
                        {
                            ColumnId = cm.ColumnId,
                            Value = cm.Value?.ToString() ?? ""
                        }).ToList()
                    };

                    grid.Rows ??= new List<Row>();
                    grid.Rows.Add(newRow);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(grid);
        }

        [HttpDelete("{id}/rows")]
        public async Task<IActionResult> DeleteAllRows(int id)
        {
            var rows = await _context.Rows
                .Include(r => r.Cells)
                .Where(r => r.DataGridId == id)
                .ToListAsync();

            if (rows.Count == 0)
                return NoContent();

            _context.Cells.RemoveRange(rows.SelectMany(r => r.Cells));
            _context.Rows.RemoveRange(rows);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDataGrid(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows).ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();


            if (!HasPermission(grid, userId, "delete"))
                return Forbid("Нет прав для удаления этой таблицы.");

            _context.DataGrids.Remove(grid);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("{id}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePermissions(int id, [FromBody] UpdateDataGridPermissionsModel model)
        {
            if (id != model.DataGridId)
                return BadRequest("Некорректный идентификатор таблицы.");

            var grid = await _context.DataGrids
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            _context.DataGridPermissions.RemoveRange(grid.Permissions);
            grid.Permissions.Clear();

            foreach (var permModel in model.Permissions)
            {
                grid.Permissions.Add(new DataGridPermission
                {
                    DataGridId = id,
                    UserId = permModel.UserId,
                    CanView = permModel.CanView,
                    CanEdit = permModel.CanEdit,
                    CanDelete = permModel.CanDelete
                });
            }

            await _context.SaveChangesAsync();

            grid = await _context.DataGrids
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            return Ok(grid);
        }

        [HttpGet("all-records")]
        public async Task<IActionResult> GetAllRecords()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var grids = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .ToListAsync();

            var result = new List<object>();
            foreach (var grid in grids)
            {
                if (!grid.IsPublic && !(grid.Permissions?.Any(p => p.UserId == userId && p.CanView) ?? false))
                {
                    continue;
                }

                var columns = grid.Columns.Select(c => new { id = c.Id, name = c.Name }).ToList();
                foreach (var row in grid.Rows)
                {
                    var cellValues = row.Cells.ToDictionary(c => c.ColumnId, c => c.Value);
                    result.Add(new
                    {
                        gridId = grid.Id,
                        gridName = grid.Name,
                        rowId = row.Id,
                        cellValues,
                        columns
                    });
                }
            }

            return Ok(result);
        }

        [HttpPost("batch-delete")]
        public async Task<IActionResult> BatchDeleteRows([FromBody] BatchDeleteModel model)
        {
            if (model == null || model.RowIds == null || !model.RowIds.Any())
                return BadRequest("Список строк пуст");

            var rows = await _context.Rows
                .Where(r => model.RowIds.Contains(r.Id))
                .Include(r => r.Cells)
                .ToListAsync();

            if (rows.Count == 0)
                return NotFound("Ни одна строка не найдена");

            var gridId = rows.First().DataGridId;
            var grid = await _context.DataGrids
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == gridId);
            if (grid == null)
                return NotFound("Таблица не найдена");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            if (grid.IsPublic)
            {
                if (!isAdmin)
                    return Forbid("Пакетные операции для публичных таблиц доступны только администратору.");
            }
            else
            {
                if (!grid.Permissions.Any(p => p.UserId == userId && p.CanEdit))
                    return Forbid("Нет прав для пакетного редактирования записей в приватной таблице.");
            }

            foreach (var row in rows)
            {
                _context.Cells.RemoveRange(row.Cells);
            }
            _context.Rows.RemoveRange(rows);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var innerMessage = ex.InnerException?.Message ?? "Нет дополнительной информации";
                return StatusCode(500, $"Ошибка удаления строк: {innerMessage}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ошибка удаления строк: {ex.Message}");
            }

            return Ok(new { Deleted = rows.Count });
        }


        [HttpPost("batch-insert")]
        public async Task<IActionResult> BatchInsertRows([FromBody] BatchInsertModel model)
        {
            if (model == null || model.Rows == null || !model.Rows.Any())
                return BadRequest("Нет строк для вставки");

            var dataGrid = await _context.DataGrids
                                 .Include(dg => dg.Columns)
                                 .Include(dg => dg.Rows)
                                 .Include(dg => dg.Permissions)
                                 .FirstOrDefaultAsync(dg => dg.Id == model.DataGridId);
            if (dataGrid == null)
                return NotFound("DataGrid не найден");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            if (dataGrid.IsPublic)
            {
                if (!isAdmin)
                    return Forbid("Пакетные операции для публичных таблиц доступны только администратору.");
            }
            else
            {
                if (!dataGrid.Permissions.Any(p => p.UserId == userId && p.CanEdit))
                    return Forbid("Нет прав для пакетного редактирования записей в приватной таблице.");
            }

            foreach (var copyRow in model.Rows)
            {

                var newRow = new Row
                {
                    DataGridId = dataGrid.Id,
                    Cells = new List<Cell>()
                };

                foreach (var copyCell in copyRow.Cells)
                {
                    if (dataGrid.Columns.Any(c => c.Id == copyCell.ColumnId))
                    {
                        newRow.Cells.Add(new Cell
                        {
                            ColumnId = copyCell.ColumnId,
                            Value = copyCell.Value ?? ""
                        });
                    }
                }

                dataGrid.Rows.Add(newRow);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Ошибка при вставке строк: " + ex.Message);
            }

            return Ok(new { Inserted = model.Rows.Count });
        }
    }
}