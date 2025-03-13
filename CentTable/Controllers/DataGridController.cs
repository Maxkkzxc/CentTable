using System.Security.Claims;
using CentTable.Data;
using CentTable.Enums;
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

        [HttpGet]
        public async Task<IActionResult> GetDataGrids()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var query = _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
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
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            if (!grid.IsPublic && !isAdmin && !grid.Permissions.Any(p => p.UserId == userId && p.CanView))
                return Forbid();

            return Ok(grid);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateDataGrid([FromBody] CreateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");

            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage));
                Console.WriteLine("Ошибки валидации: " + errors);
                return BadRequest(errors);
            }

            var grid = new DataGrid
            {
                Name = model.Name,
                IsPublic = model.IsPublic,
                Columns = model.Columns.Select(c => new Column
                {
                    Name = c.Name,
                    Type = c.Type,
                    IsRequired = c.IsRequired,
                    ValidationRegex = c.ValidationRegex,
                    Options = c.Options
                }).ToList(),
                Rows = new List<Row>(),
                Permissions = new List<DataGridPermission>()
            };

            foreach (var col in grid.Columns)
            {
                col.DataGrid = grid;
            }

            _context.DataGrids.Add(grid);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                Console.WriteLine("Ошибка при сохранении таблицы и колонок: " + inner);
                return StatusCode(500, "Ошибка при сохранении таблицы и колонок: " + inner);
            }

            var defaultRow = new Row
            {
                DataGridId = grid.Id,
                Cells = new List<Cell>()
            };

            foreach (var col in grid.Columns)
            {
                var colModel = model.Columns.FirstOrDefault(c => c.Name == col.Name);
                string cellValue = (col.Type == ColumnType.SingleSelect || col.Type == ColumnType.MultiSelect)
                                        ? null
                                        : colModel?.InitialValue;

                var cell = new Cell
                {
                    Row = defaultRow,
                    ColumnId = col.Id,
                    Value = cellValue
                };
                defaultRow.Cells.Add(cell);
            }

            grid.Rows.Add(defaultRow);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                Console.WriteLine("Ошибка при сохранении строки и ячеек: " + inner);
                return StatusCode(500, "Ошибка при сохранении строки и ячеек: " + inner);
            }

            return Ok(grid);
        }





        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateDataGrid(int id, [FromBody] UpdateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            grid.Name = model.Name;
            grid.IsPublic = model.IsPublic;

            foreach (var colModel in model.Columns)
            {
                var col = grid.Columns.FirstOrDefault(c => c.Id == colModel.Id);
                if (col != null)
                {
                    col.Options = colModel.Options;
                }
            }

            foreach (var rowModel in model.Rows)
            {
                var row = grid.Rows.FirstOrDefault(r => r.Id == rowModel.Id);
                if (row != null)
                {
                    foreach (var cellModel in rowModel.Cells)
                    {
                        var cell = row.Cells.FirstOrDefault(c => c.ColumnId == cellModel.ColumnId);
                        if (cell != null)
                        {
                            if (cellModel.Value is JArray jArray)
                            {
                                var arr = jArray.ToObject<List<string>>();
                                cell.Value = string.Join(",", arr);
                            }
                            else
                            {
                                cell.Value = cellModel.Value?.ToString();
                            }
                        }
                    }
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Ошибка при обновлении таблицы: " + ex.ToString());
                return StatusCode(500, "Ошибка при обновлении таблицы: " + ex.Message);
            }

            return Ok(grid);
        }
    }
}
